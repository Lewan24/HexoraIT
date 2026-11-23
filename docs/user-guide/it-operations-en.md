# IT Operations & Changes

Select an organization, then **IT Operations & Changes** under Operations. An administrator can hide the module in organization settings; organization and individual permissions still apply.

1. Choose **New record** and A02 (GPO), A06 (firewall), or D02 (restore test).
2. Enter the title, risk, type, description, optional asset and planned dates. The requester is the default implementer and owner.
3. Fill the template. **Add row** records multiple GPO/firewall settings with previous/new values. Keep passwords and private keys in Passwords and enter references here.
4. **Save draft** permits incomplete values. Reopen from the register. Back navigation inside the editor and browser tab closure warn about unsaved edits; sidebar navigation and organization switching do not yet provide complete protection. Save first.
5. Complete required fields, save, and apply **Submitted**. An administrator routes the change to approval; an independent administrator approves. Requesters and implementers cannot approve their own changes.
6. Apply execution, verification, completion and closure actions separately. Record outcomes in the action notes. Template values freeze on submission. Closure requires administrator permission and notes. An emergency bypass requires a reason and independent retrospective review before closure.
7. Inspect activity/revisions below the form. **Export PDF** becomes available after submission.

D02 uses Draft → Submitted → Closed → Archived, without approval. Successful restore tests require recorded data integrity and application-function verification.

The register supports search, filters, sorting and pagination. My Documents filters by requester. Pending Approvals shows awaiting records; the API determines who can decide. Asset details include a Related Changes tab.

A 409 conflict means the record changed; reload before saving or deciding. Template administration is not available yet. This module does not certify standards or legal compliance. See [technical scope and limitations](../it-operations.md).

For a **Perpetual** license, the expiry control is disabled. Switching to a term license requires an expiry date again.
