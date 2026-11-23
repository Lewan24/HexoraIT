using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationTemplateAdministration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Key",
                table: "OperationTemplates",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "OperationTemplates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PublishedBy",
                table: "OperationTemplates",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OperationPolicies",
                columns: table => new
                {
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    StandardPreApproved = table.Column<bool>(type: "boolean", nullable: false),
                    RequireLowRiskApproval = table.Column<bool>(type: "boolean", nullable: false),
                    RequireNormalApproval = table.Column<bool>(type: "boolean", nullable: false),
                    SeparateHighRiskDuties = table.Column<bool>(type: "boolean", nullable: false),
                    AllowLowRiskSelfApproval = table.Column<bool>(type: "boolean", nullable: false),
                    AllowDocumentedExceptions = table.Column<bool>(type: "boolean", nullable: false),
                    RetentionDays = table.Column<int>(type: "integer", nullable: false),
                    ReportingRulesJson = table.Column<string>(type: "jsonb", nullable: false),
                    RevisionToken = table.Column<Guid>(type: "uuid", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationPolicies", x => x.OrganizationId);
                    table.ForeignKey(
                        name: "FK_OperationPolicies_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationPolicyRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SnapshotJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationPolicyRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationPolicyRevisions_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationTemplateSettings",
                columns: table => new
                {
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    RevisionToken = table.Column<Guid>(type: "uuid", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationTemplateSettings", x => new { x.OrganizationId, x.TemplateKey });
                    table.ForeignKey(
                        name: "FK_OperationTemplateSettings_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OperationTemplates_OrganizationId",
                table: "OperationTemplates",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPolicyRevisions_OrganizationId_CreatedAt",
                table: "OperationPolicyRevisions",
                columns: new[] { "OrganizationId", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_OperationTemplates_Organizations_OrganizationId",
                table: "OperationTemplates",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.Sql("""
                CREATE TRIGGER operation_policy_revisions_append_only BEFORE UPDATE OR DELETE ON "OperationPolicyRevisions"
                  FOR EACH ROW EXECUTE FUNCTION hexorait_operations_append_only();
                ALTER TABLE "OperationPolicies" ADD CONSTRAINT "CK_OperationPolicies_RetentionDays" CHECK ("RetentionDays" BETWEEN 1 AND 36500);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                  IF EXISTS (SELECT 1 FROM "OperationTemplates" WHERE length("Key") > 10) THEN
                    RAISE EXCEPTION 'Cannot downgrade while organization templates use extended keys';
                  END IF;
                END $$;
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_OperationTemplates_Organizations_OrganizationId",
                table: "OperationTemplates");

            migrationBuilder.DropTable(
                name: "OperationPolicies");

            migrationBuilder.DropTable(
                name: "OperationPolicyRevisions");

            migrationBuilder.DropTable(
                name: "OperationTemplateSettings");

            migrationBuilder.DropIndex(
                name: "IX_OperationTemplates_OrganizationId",
                table: "OperationTemplates");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "OperationTemplates");

            migrationBuilder.DropColumn(
                name: "PublishedBy",
                table: "OperationTemplates");

            migrationBuilder.AlterColumn<string>(
                name: "Key",
                table: "OperationTemplates",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);
        }
    }
}
