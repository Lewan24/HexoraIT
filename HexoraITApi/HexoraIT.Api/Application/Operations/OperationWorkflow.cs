namespace HexoraITApi.Application.Operations;

public static class OperationWorkflow
{
    public static readonly IReadOnlyDictionary<string, string[]> Transitions = new Dictionary<string, string[]>
    {
        ["Draft"] = ["Submitted", "Cancelled"],
        ["Submitted"] = ["Under Review", "Awaiting Approval", "Cancelled"],
        ["Under Review"] = ["Awaiting Approval"],
        ["Awaiting Approval"] = ["Approved", "Rejected"],
        ["Approved"] = ["Scheduled", "In Progress"],
        ["Scheduled"] = ["In Progress", "Cancelled"],
        ["In Progress"] = ["Verification", "Failed", "Rolled Back"],
        ["Verification"] = ["Completed", "Failed", "Rolled Back"],
        ["Completed"] = ["Closed"],
        ["Failed"] = ["Closed"],
        ["Rolled Back"] = ["Closed"],
        ["Closed"] = ["Archived"]
    };

    public static bool CanTransition(string from, string to, string type, bool operationalRecord, bool requiresApproval = false)
    {
        if (operationalRecord) return (from, to) is ("Draft", "Submitted") or ("Closed", "Archived") ||
            (requiresApproval ? (from, to) is ("Submitted", "Approved") or ("Submitted", "Rejected") or ("Approved", "Closed") : (from, to) is ("Submitted", "Closed"));
        if (type == "Emergency" && to == "In Progress" && from is "Draft" or "Submitted" or "Under Review" or "Awaiting Approval") return true;
        return Transitions.TryGetValue(from, out var targets) && targets.Contains(to);
    }

    public static bool Administrative(string target) => target is "Under Review" or "Awaiting Approval" or "Approved" or "Rejected" or "Closed" or "Archived" or "RetrospectiveReview";
}
