using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationAuditHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizationAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    AuditDate = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationAudits_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationAuditUpdates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AuditId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Author = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationAuditUpdates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationAuditUpdates_OrganizationAudits_AuditId",
                        column: x => x.AuditId,
                        principalTable: "OrganizationAudits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationAuditAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdateId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    Size = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationAuditAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationAuditAttachments_OrganizationAuditUpdates_Updat~",
                        column: x => x.UpdateId,
                        principalTable: "OrganizationAuditUpdates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAuditAttachments_UpdateId",
                table: "OrganizationAuditAttachments",
                column: "UpdateId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAudits_OrganizationId_AuditDate_Id",
                table: "OrganizationAudits",
                columns: new[] { "OrganizationId", "AuditDate", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAuditUpdates_AuditId_CreatedAt_Id",
                table: "OrganizationAuditUpdates",
                columns: new[] { "AuditId", "CreatedAt", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationAuditAttachments");

            migrationBuilder.DropTable(
                name: "OrganizationAuditUpdates");

            migrationBuilder.DropTable(
                name: "OrganizationAudits");
        }
    }
}
