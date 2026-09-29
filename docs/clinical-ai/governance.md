# Clinical AI governance status

**No model is authorized for inference. No diagnosis, probability, clinical accuracy or validation is claimed.**

The implemented registry accepts immutable draft lineage: version identity, artifact SHA-256, dataset identity, feature schema, training date, declared metrics, limitations, intended and contraindicated use. Registry entries remain DRAFT/NOT_DEPLOYED. Declared metrics have not been measured or independently verified; an artifact digest declaration does not prove an artifact was supplied or validated.

Authorized prediction requests have supported internal schema validation, scope/idempotency controls, encrypted request evidence and an audited NOT_CONFIGURED outcome. No result is synthesized to make the workflow look complete. Stored unavailable requests are not a patient prediction-history feature. Training, evaluation, clinically approved safety/red-flag logic, controlled approval/activation, inference, result history and drift/performance monitoring remain absent.

Required before activation: named accountable clinical owner; approved feature/label/code/unit contracts; approved red-flag and emergency escalation SOP; licensed/provenance-checked data and model artifact; independently reviewed evaluation and subgroup/shift limitations; clinical validation appropriate to the intended setting; privacy/consent/access/retention decisions; deployment and rollback approval; monitoring and incident thresholds. These are not satisfied by synthetic data or passing software tests.

The UI and API boundary use:

> This tool provides informational decision support and does not provide a medical diagnosis. Clinical decisions must be made by qualified healthcare professionals.
