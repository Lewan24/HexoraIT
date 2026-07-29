using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFileExplorer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FileFolders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ParentFolderId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileFolders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FileFolders_FileFolders_ParentFolderId",
                        column: x => x.ParentFolderId,
                        principalTable: "FileFolders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FileFolders_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    BlobPath = table.Column<string>(type: "text", nullable: false),
                    FolderId = table.Column<Guid>(type: "uuid", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredFiles_FileFolders_FolderId",
                        column: x => x.FolderId,
                        principalTable: "FileFolders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StoredFiles_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FileFolders_OrganizationId",
                table: "FileFolders",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_FileFolders_ParentFolderId",
                table: "FileFolders",
                column: "ParentFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_FolderId",
                table: "StoredFiles",
                column: "FolderId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_OrganizationId",
                table: "StoredFiles",
                column: "OrganizationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropTable(
                name: "FileFolders");
        }
    }
}
