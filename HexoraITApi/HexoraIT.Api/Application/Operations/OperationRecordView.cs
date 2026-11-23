using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Application.Operations;

// Explicit response contract: never serialize tracked organization/user navigation graphs.
public sealed record OperationRecordView(Guid Id, string Number, Guid TemplateVersionId, string Title, string Description,
    string Category, string Status, string Risk, string Priority, string ChangeType, Guid RequesterId, Guid ImplementerId, Guid OwnerId,
    Guid? AssetId, DateTime? PlannedStart, DateTime? PlannedEnd, DateTime? ActualStart, DateTime? ActualEnd,
    Guid RevisionToken, DateTime CreatedAt, DateTime ModifiedAt, Guid ModifiedBy, DateTime? ClosedAt,
    bool EmergencyBypassed, bool RetrospectiveReviewed)
{
    public static OperationRecordView From(OperationRecord r) => new(r.Id, r.Number, r.TemplateVersionId, r.Title, r.Description,
        r.Category, r.Status, r.Risk, r.Priority, r.ChangeType, r.RequesterId, r.ImplementerId, r.OwnerId,
        r.AssetId, r.PlannedStart, r.PlannedEnd, r.ActualStart, r.ActualEnd, r.RevisionToken, r.CreatedAt, r.ModifiedAt, r.ModifiedBy,
        r.ClosedAt, r.EmergencyBypassed, r.RetrospectiveReviewed);
}
