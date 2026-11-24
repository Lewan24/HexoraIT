# IT Operations & Changes

Select an organization, then **IT Operations & Changes** under Operations. An administrator can hide the module in organization settings; organization and individual permissions still apply.

1. Choose **Basic document** for a title, summary, content and optional asset/evidence references. Choose **Advanced template** for any of the 72 detailed templates A01–F10, including A02 (GPO), A06 (firewall) and D02 (restore test). Basic records skip change-specific fields. The library supports search, category/scope filters and pagination.
2. Enter the title, risk, type, description, optional asset and planned dates. The requester is the default implementer and owner; organization member pickers allow reassignment. High risk defaults to separate requester and implementer.
3. Fill the template. **Add row** records multiple GPO/firewall settings with previous/new values. Keep passwords and private keys in Passwords and enter references here.
4. **Save draft** permits incomplete values. Reopen from the register. Back navigation inside the editor and browser tab closure warn about unsaved edits; sidebar navigation and organization switching do not yet provide complete protection. Save first.
5. Complete required visible fields, save, and apply **Submitted**. An administrator routes the change to approval; independent approval is the default. Policy can permit direct approval for preapproved/no-approval-required changes and low-risk self-approval by an authorized administrator.
6. Apply execution, verification, completion and closure actions separately. Record outcomes in the action notes. Template values freeze on submission. Closure requires administrator permission and notes. An emergency bypass requires a reason and independent retrospective review before closure.
7. Inspect activity/revisions below the form. **Export PDF** becomes available after submission. Owners/administrators can also include saved basic and advanced records, including explicitly labeled drafts, in **Documentation PDF → IT Operations & Changes**. Choose all or specific records; the report uses current saved content. Save edits first.

D02 and minor operational records use Draft → Submitted → Closed → Archived without approval. Approval-required documents instead add Approved/Rejected after submission. Successful restore tests require recorded data integrity and application verification. Temporary firewall rules require an expiry date. Conditional fields appear according to the selected values.

The register supports search, filters, sorting and pagination. My Documents filters by requester. Pending Approvals shows awaiting records; the API determines who can decide. Asset details include a Related Changes tab.

A 409 conflict means the record changed; reload before saving or deciding. Administrators can **Clone to organization**, edit JSON as a new version, **Validate schema** with an interactive preview, import/export JSON and activate/deactivate templates. Existing records keep their exact original version; new records require an active latest version.

**Organization operations policy** controls preapproval, separation of duties, low-risk self-approval and documented administrator exceptions. Policy never grants the approver role: administrative permission remains required. Exceptions store the reason, authenticated administrator and time. Retention is a configurable day count without automatic deletion. Reporting criteria/deadlines are organization-maintained JSON data; the application does not determine legal reportability.

Restricted fields are visible to organization administrators/owners. Other users receive filtered API, PDF and revision responses; saving ordinary fields preserves hidden values. Secret fields show vault instructions and reject values. Never paste secrets into ordinary text fields.

This module does not certify standards or legal compliance. See [technical scope and limitations](../it-operations.md).

For a **Perpetual** license, the expiry control is disabled. Switching to a term license requires an expiry date again.
