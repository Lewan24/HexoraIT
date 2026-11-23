using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationsSlice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OperationTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SchemaJson = table.Column<string>(type: "jsonb", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OperationRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    TemplateVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: false),
                    Category = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ChangeType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Risk = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImplementerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    PlannedStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PlannedEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActualStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActualEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValuesJson = table.Column<string>(type: "jsonb", nullable: false),
                    RevisionToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EmergencyBypassed = table.Column<bool>(type: "boolean", nullable: false),
                    RetrospectiveReviewed = table.Column<bool>(type: "boolean", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    SortIndex = table.Column<int>(type: "integer", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationRecords", x => x.Id);
                    table.UniqueConstraint("AK_OperationRecords_Id_OrganizationId", x => new { x.Id, x.OrganizationId });
                    table.ForeignKey(
                        name: "FK_OperationRecords_OperationTemplates_TemplateVersionId",
                        column: x => x.TemplateVersionId,
                        principalTable: "OperationTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationRecords_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OperationRecords_UserOrganizations_ImplementerId_Organizati~",
                        columns: x => new { x.ImplementerId, x.OrganizationId },
                        principalTable: "UserOrganizations",
                        principalColumns: new[] { "UserId", "OrganizationId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationRecords_UserOrganizations_OwnerId_OrganizationId",
                        columns: x => new { x.OwnerId, x.OrganizationId },
                        principalTable: "UserOrganizations",
                        principalColumns: new[] { "UserId", "OrganizationId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationRecords_UserOrganizations_RequesterId_Organization~",
                        columns: x => new { x.RequesterId, x.OrganizationId },
                        principalTable: "UserOrganizations",
                        principalColumns: new[] { "UserId", "OrganizationId" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EventType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ToStatus = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationActivities_OperationRecords_RecordId_OrganizationId",
                        columns: x => new { x.RecordId, x.OrganizationId },
                        principalTable: "OperationRecords",
                        principalColumns: new[] { "Id", "OrganizationId" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    RevisionToken = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SnapshotJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationRevisions_OperationRecords_RecordId_OrganizationId",
                        columns: x => new { x.RecordId, x.OrganizationId },
                        principalTable: "OperationRecords",
                        principalColumns: new[] { "Id", "OrganizationId" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OperationActivities_OrganizationId_RecordId_OccurredAt",
                table: "OperationActivities",
                columns: new[] { "OrganizationId", "RecordId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationActivities_RecordId_OrganizationId",
                table: "OperationActivities",
                columns: new[] { "RecordId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_ImplementerId_OrganizationId",
                table: "OperationRecords",
                columns: new[] { "ImplementerId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OrganizationId_AssetId",
                table: "OperationRecords",
                columns: new[] { "OrganizationId", "AssetId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OrganizationId_Number",
                table: "OperationRecords",
                columns: new[] { "OrganizationId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OrganizationId_RequesterId",
                table: "OperationRecords",
                columns: new[] { "OrganizationId", "RequesterId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OrganizationId_Status_ModifiedAt",
                table: "OperationRecords",
                columns: new[] { "OrganizationId", "Status", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OrganizationId_Year_Sequence",
                table: "OperationRecords",
                columns: new[] { "OrganizationId", "Year", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_OwnerId_OrganizationId",
                table: "OperationRecords",
                columns: new[] { "OwnerId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_RequesterId_OrganizationId",
                table: "OperationRecords",
                columns: new[] { "RequesterId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRecords_TemplateVersionId",
                table: "OperationRecords",
                column: "TemplateVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationRevisions_RecordId_OrganizationId",
                table: "OperationRevisions",
                columns: new[] { "RecordId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationRevisions_RecordId_RevisionToken",
                table: "OperationRevisions",
                columns: new[] { "RecordId", "RevisionToken" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationTemplates_Key_ContentHash",
                table: "OperationTemplates",
                columns: new[] { "Key", "ContentHash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationTemplates_Key_Version",
                table: "OperationTemplates",
                columns: new[] { "Key", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OperationActivities");

            migrationBuilder.DropTable(
                name: "OperationRevisions");

            migrationBuilder.DropTable(
                name: "OperationRecords");

            migrationBuilder.DropTable(
                name: "OperationTemplates");
        }
    }
}
