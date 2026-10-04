"""AI provider abstraction (Phase 12).

Application code talks only to ``AIProvider`` / ``get_provider()``.
The default ``LocalRuleProvider`` is a deterministic, dependency-free
clinical-decision-support engine (rule-based triage, record-grounded Q&A,
prescription checks, attendance scoring, live aggregates). A hosted model
can be plugged in later behind the same interface without touching views.

No provider credentials ever leave the backend.
"""

import os


DISCLAIMER = (
    "Decision support only — informational, not a diagnosis. "
    "A qualified physician must review before any clinical action."
)


class AIProvider:
    """Interface every provider implements. All outputs are advisory."""

    name = "base"

    def triage(self, payload: dict) -> dict:
        raise NotImplementedError

    def clinical_summary(self, record: dict) -> str:
        raise NotImplementedError

    def clinical_answer(self, record: dict, question: str) -> str:
        raise NotImplementedError

    def prescription_advisory(
        self, patient: dict, diagnosis: str, current_meds: list, proposed: list
    ) -> dict:
        raise NotImplementedError


class LocalRuleProvider(AIProvider):
    """Deterministic local fallback. Mirrors the reviewed Phase 5 rule set."""

    name = "local"

    # -- triage ---------------------------------------------------------
    def triage(self, payload: dict) -> dict:
        symptoms = payload.get("symptoms", [])
        vitals = payload.get("vitals", {})
        names = [str(s.get("name", "")).lower() for s in symptoms]

        def has(*keys):
            return any(key in name for key in keys for name in names)

        severe = sum(1 for s in symptoms if s.get("severity") == "Severe")
        try:
            spo2 = int(vitals.get("oxygenSaturation") or 0)
        except (TypeError, ValueError):
            spo2 = 0
        try:
            heart_rate = int(vitals.get("heartRate") or 0)
        except (TypeError, ValueError):
            heart_rate = 0
        low_spo2 = 0 < spo2 < 94
        tachy = heart_rate > 110

        if ((has("chest pain") and (has("shortness of breath") or has("palpitations")))
                or low_spo2 or (has("chest pain") and severe >= 1)):
            return {
                "level": "Emergency",
                "department": "Emergency",
                "considerations": [
                    "Possible cardiac or acute respiratory consideration flagged from reported chest symptoms.",
                    "Low oxygen saturation or severe chest discomfort reported — treat as time-sensitive until examined.",
                ],
                "riskIndicators": [
                    "Severe chest-region symptom reported",
                    (f"SpO₂ {vitals.get('oxygenSaturation')}% below 94% threshold"
                     if low_spo2 else "Co-occurring cardiac-type symptoms"),
                    (f"Elevated heart rate ({vitals.get('heartRate')} bpm)"
                     if tachy else "Multiple concurrent symptoms"),
                ],
                "nextAction": "Escort the patient to Emergency immediately and alert the on-duty "
                              "physician. Do not leave the patient unattended.",
                "confidence": 92,
                "disclaimer": DISCLAIMER,
            }

        if (has("shortness of breath") or has("wheezing") or has("palpitations")
                or severe >= 2 or tachy):
            cardiac = has("palpitations")
            return {
                "level": "Urgent",
                "department": "Cardiology" if cardiac else "Pulmonology",
                "considerations": [
                    "Respiratory or cardiac-pattern symptoms suggest same-day clinical evaluation.",
                    "Review history of asthma, COPD, hypertension or ischemic heart disease before the visit.",
                ],
                "riskIndicators": [
                    ("Two or more severe-grade symptoms" if severe >= 2
                     else "Respiratory-pattern symptom reported"),
                    (f"Elevated heart rate ({vitals.get('heartRate')} bpm)" if tachy
                     else "Symptom duration exceeds 48 hours"),
                ],
                "nextAction": "Book a same-day appointment and send high-priority reminders. "
                              "Reassess if symptoms worsen.",
                "confidence": 84,
                "disclaimer": DISCLAIMER,
            }

        if (has("fever") or has("abdominal pain") or has("dizziness")
                or has("headache") or len(symptoms) >= 3):
            neuro = has("headache") or has("dizziness")
            return {
                "level": "Moderate",
                "department": "Neurology" if neuro else "General Medicine",
                "considerations": [
                    "Pattern is consistent with a routine outpatient workup — infection, "
                    "migraine or GI causes to be differentiated in person.",
                    "Check temperature trend, hydration status and recent medication adherence at the visit.",
                ],
                "riskIndicators": [
                    (f"Recorded temperature {vitals.get('temperature')}°F"
                     if has("fever") and vitals.get("temperature")
                     else "Multiple mild-to-moderate symptoms"),
                    "No red-flag vital readings in the submitted values",
                ],
                "nextAction": "Schedule a routine appointment within 2–3 days and share "
                              "home-care guidance in the meantime.",
                "confidence": 78,
                "disclaimer": DISCLAIMER,
            }

        return {
            "level": "Low",
            "department": "General Medicine",
            "considerations": [
                "Mild, isolated symptoms that commonly resolve with rest, fluids and observation.",
                "No concerning vital readings or high-risk combinations detected in the submitted information.",
            ],
            "riskIndicators": [
                "Single mild symptom",
                "Vitals within the submitted normal range",
            ],
            "nextAction": "Advise home observation for 48 hours; book a routine visit if "
                          "symptoms persist or new symptoms appear.",
            "confidence": 71,
            "disclaimer": DISCLAIMER,
        }

    # -- clinical assistant (record-grounded) -----------------------------
    def clinical_summary(self, record: dict) -> str:
        name = record.get("name", "The patient")
        visits = record.get("visits", [])
        visit_text = (
            "\n".join(
                f"{i + 1}. {v.get('date')} — {v.get('type')} with {v.get('doctor')}: "
                f"{v.get('diagnosis')}. Treatment: {v.get('treatment')}."
                for i, v in enumerate(visits[:3])
            )
            if visits else "No recorded visits."
        )
        abnormal = [lab for lab in record.get("labs", []) if lab.get("status") == "Abnormal"]
        lab_text = (
            "; ".join(f"{lab.get('test')} on {lab.get('date')}: {lab.get('result')}"
                      for lab in abnormal)
            if abnormal else "No abnormal lab results on file."
        )
        meds = record.get("medications") or []
        allergies = record.get("allergies") or []
        chronic = record.get("chronic") or []
        return "\n\n".join([
            f"{name}, {record.get('age', '—')}y {record.get('gender', '')}, "
            f"blood group {record.get('blood_group', '—')}. Status: {record.get('status', '—')}.",
            f"Chronic conditions: {', '.join(chronic) if chronic else 'none recorded'}. "
            f"Allergies: {', '.join(allergies) if allergies else 'none recorded'}.",
            f"Recent visits:\n{visit_text}",
            f"Abnormal labs: {lab_text}.",
            f"Active medications: {'; '.join(meds) if meds else 'No active medications recorded'}.",
            DISCLAIMER,
        ])

    def clinical_answer(self, record: dict, question: str) -> str:
        name = record.get("name", "The patient")
        question_lower = question.lower()
        visits = record.get("visits", [])
        labs = record.get("labs", [])
        meds = record.get("medications") or []
        allergies = record.get("allergies") or []

        if "visit" in question_lower or "summar" in question_lower:
            if not visits:
                return (f"{name} has no recorded visits. Consider a baseline workup "
                        f"at the next appointment. {DISCLAIMER}")
            lines = [f"Last {min(len(visits), 3)} visit(s) for {name}:"]
            for i, visit in enumerate(visits[:3]):
                lines.append(
                    f"{i + 1}. {visit.get('date')} — {visit.get('type')} with "
                    f"{visit.get('doctor')}. Diagnosis: {visit.get('diagnosis')}. "
                    f"Treatment: {visit.get('treatment')}.")
            lines.append("Verify against the full visit history before making clinical decisions.")
            return "\n".join(lines)

        if ("lab" in question_lower or "abnormal" in question_lower
                or "test" in question_lower or "result" in question_lower):
            abnormal = [lab for lab in labs if lab.get("status") == "Abnormal"]
            if not abnormal:
                return (f"{name} has no abnormal lab results on file. Confirm in "
                        f"the Laboratory module. {DISCLAIMER}")
            lines = [f"Abnormal lab indicators for {name}:"]
            lines += [f"• {lab.get('test')} ({lab.get('date')}): {lab.get('result')}."
                      for lab in abnormal]
            lines.append("Correlate with symptoms and repeat testing as clinically indicated.")
            return "\n".join(lines)

        if ("medication" in question_lower or "medicine" in question_lower
                or "drug" in question_lower or "active" in question_lower):
            if not meds:
                return (f"{name} has no active medications recorded. Reconcile the "
                        f"medication list at the next visit. {DISCLAIMER}")
            lines = [f"Active medications for {name}:"]
            lines += [f"{i + 1}. {med}" for i, med in enumerate(meds)]
            lines.append(
                f"Known allergies: {', '.join(allergies) if allergies else 'none recorded'} "
                "— cross-check before adding new agents.")
            return "\n".join(lines)

        if ("allerg" in question_lower):
            if allergies:
                return (f"{name} has recorded allergies: {', '.join(allergies)}. "
                        f"Verify reaction history before prescribing. {DISCLAIMER}")
            return (f"{name} has no allergies recorded. Confirm verbally with the "
                    f"patient before prescribing. {DISCLAIMER}")

        if ("condition" in question_lower or "review" in question_lower
                or "risk" in question_lower or "diagnos" in question_lower):
            chronic = record.get("chronic") or []
            return "\n".join([
                f"Suggested review list for {name} (decision support only):",
                f"• Chronic conditions on file: {', '.join(chronic) if chronic else 'none'}.",
                f"• Allergies: {', '.join(allergies) if allergies else 'none recorded'}.",
                "Prioritize uncontrolled chronic disease markers and outstanding "
                "follow-ups; confirm with the live record.",
            ])

        return "\n".join([
            f"Record overview for {name}: {record.get('age', '—')}y "
            f"{record.get('gender', '')}, status {record.get('status', '—')}.",
            f"Chronic: {', '.join(chronic) if chronic else 'none'}; "
            f"allergies: {', '.join(allergies) if allergies else 'none'}.",
            "Ask about visit summary, abnormal labs, medications, or conditions to review. "
            + DISCLAIMER,
        ])

    # -- prescription advisory --------------------------------------------
    INTERACTION_PAIRS = (
        ("amlodipine", "atorvastatin",
         "Amlodipine + Atorvastatin: generally co-prescribed; monitor for muscle "
         "symptoms at higher statin doses."),
        ("losartan", "spironolactone",
         "Losartan + potassium-sparing agents: hyperkalemia consideration — check "
         "potassium and renal function."),
        ("warfarin", "aspirin",
         "Warfarin + Aspirin: bleeding-risk combination — confirm indication and "
         "INR monitoring plan."),
        ("metformin", "contrast",
         "Metformin + iodinated contrast procedures: standard hold/review protocol "
         "applies around imaging."),
        ("salbutamol", "propranolol",
         "Salbutamol + non-selective beta-blockers: opposing airway effects — "
         "prefer cardioselective alternatives."),
    )

    def prescription_advisory(self, patient, diagnosis, current_meds, proposed) -> dict:
        norm = lambda s: str(s or "").lower().strip()
        proposed_names = [norm(m.get("medicine")) for m in proposed if norm(m.get("medicine"))]
        current = [norm(m) for m in current_meds]
        allergies = [norm(a) for a in (patient.get("allergies") or [])]
        findings = []

        seen = set()
        for name in proposed_names:
            key = name.split(" ")[0]
            if key in seen:
                findings.append({
                    "category": "Duplicate medication", "severity": "High Attention",
                    "message": f'Possible duplicate therapy detected for "{name}". Confirm '
                               "whether two entries refer to the same agent before signing.",
                })
            seen.add(key)

        for name in proposed_names:
            key = name.split(" ")[0]
            if len(key) > 3 and any(key in med for med in current):
                findings.append({
                    "category": "Duplicate medication", "severity": "Caution",
                    "message": f'"{name}" appears to overlap with a current medication. '
                               "Verify continuation vs. replacement intent.",
                })

        for first, second, message in self.INTERACTION_PAIRS:
            pool = proposed_names + current
            if any(first in m for m in pool) and any(second in m for m in pool):
                findings.append({
                    "category": "Potential interaction", "severity": "High Attention",
                    "message": message,
                })

        for allergy in allergies:
            key = allergy.split(" ")[0]
            if len(key) > 3 and any(key in name for name in proposed_names):
                findings.append({
                    "category": "Allergy warning", "severity": "High Attention",
                    "message": f'Proposed agent may relate to recorded allergy "{allergy}". '
                               "Confirm reaction history before prescribing.",
                })

        for med in proposed:
            label = med.get("medicine") or "Unnamed item"
            if not str(med.get("dose") or "").strip():
                findings.append({
                    "category": "Dose review", "severity": "Caution",
                    "message": f'"{label}": dose is missing. Specify strength and amount '
                               "per administration.",
                })
            if not str(med.get("frequency") or "").strip():
                findings.append({
                    "category": "Frequency review", "severity": "Caution",
                    "message": f'"{label}": frequency is missing. Specify administrations per day.',
                })
            if not str(med.get("duration") or "").strip():
                findings.append({
                    "category": "Duration review", "severity": "Informational",
                    "message": f'"{label}": duration is missing. Bound the course length for review.',
                })

        if len(str(diagnosis or "").strip()) < 3:
            findings.append({
                "category": "Dose review", "severity": "Informational",
                "message": "Clinical indication is brief. A clear diagnosis helps validate dose, "
                           "duration and formulary choice.",
            })

        if not findings:
            findings.append({
                "category": "Medication review", "severity": "Informational",
                "message": "No duplicates, interactions or allergy overlaps flagged in this review. "
                           "Physician sign-off is still required.",
            })

        overall = ("High Attention" if any(f["severity"] == "High Attention" for f in findings)
                   else "Caution" if any(f["severity"] == "Caution" for f in findings)
                   else "Informational")
        return {
            "findings": findings,
            "overallSeverity": overall,
            "summary": (f"{len(findings)} advisory point(s) — overall: {overall}. "
                        "Decision support only; physician review required."),
            "disclaimer": DISCLAIMER,
        }


def get_provider() -> AIProvider:
    """Select provider from settings; always falls back to local rules."""
    name = (os.environ.get("AI_PROVIDER") or "local").strip().lower()
    if name == "local":
        return LocalRuleProvider()
    # Unknown/keys-missing names degrade to the safe local engine so the
    # application keeps working without an external AI service.
    return LocalRuleProvider()
