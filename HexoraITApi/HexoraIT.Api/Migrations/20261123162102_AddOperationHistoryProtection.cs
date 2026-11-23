using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationHistoryProtection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE INDEX "IX_OperationRecords_Search" ON "OperationRecords"
                  USING GIN (to_tsvector('simple', "Title" || ' ' || "Description"));
                CREATE FUNCTION hexorait_operations_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  RAISE EXCEPTION 'Operation history and published templates are append-only';
                END;
                $$;
                CREATE TRIGGER operation_templates_append_only BEFORE UPDATE OR DELETE ON "OperationTemplates"
                  FOR EACH ROW EXECUTE FUNCTION hexorait_operations_append_only();
                CREATE TRIGGER operation_revisions_append_only BEFORE UPDATE OR DELETE ON "OperationRevisions"
                  FOR EACH ROW EXECUTE FUNCTION hexorait_operations_append_only();
                CREATE TRIGGER operation_activities_append_only BEFORE UPDATE OR DELETE ON "OperationActivities"
                  FOR EACH ROW EXECUTE FUNCTION hexorait_operations_append_only();
                ALTER TABLE "OperationRecords" ADD CONSTRAINT "CK_OperationRecords_Dates"
                  CHECK (("PlannedEnd" IS NULL OR "PlannedStart" IS NULL OR "PlannedEnd" >= "PlannedStart")
                    AND ("ActualEnd" IS NULL OR "ActualStart" IS NULL OR "ActualEnd" >= "ActualStart"));
                ALTER TABLE "OperationRecords" ADD CONSTRAINT "CK_OperationRecords_Sequence" CHECK ("Sequence" > 0);
                ALTER TABLE "OperationRecords" ADD CONSTRAINT "CK_OperationRecords_Status"
                  CHECK ("Status" IN ('Draft','Submitted','Under Review','Awaiting Approval','Approved','Scheduled','In Progress',
                    'Verification','Completed','Closed','Rejected','Cancelled','Failed','Rolled Back','Archived'));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "OperationRecords" DROP CONSTRAINT "CK_OperationRecords_Dates";
                ALTER TABLE "OperationRecords" DROP CONSTRAINT "CK_OperationRecords_Sequence";
                ALTER TABLE "OperationRecords" DROP CONSTRAINT "CK_OperationRecords_Status";
                DROP TRIGGER operation_templates_append_only ON "OperationTemplates";
                DROP TRIGGER operation_revisions_append_only ON "OperationRevisions";
                DROP TRIGGER operation_activities_append_only ON "OperationActivities";
                DROP FUNCTION hexorait_operations_append_only();
                DROP INDEX "IX_OperationRecords_Search";
                """);
        }
    }
}
