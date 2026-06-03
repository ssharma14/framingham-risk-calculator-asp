using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FraminghamRisk.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Assessments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Age = table.Column<int>(type: "INTEGER", nullable: false),
                    Sex = table.Column<string>(type: "TEXT", nullable: false),
                    BpTreated = table.Column<bool>(type: "INTEGER", nullable: false),
                    SystolicBp = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalCholesterol = table.Column<double>(type: "REAL", nullable: false),
                    Hdl = table.Column<double>(type: "REAL", nullable: false),
                    Smoker = table.Column<bool>(type: "INTEGER", nullable: false),
                    Diabetic = table.Column<bool>(type: "INTEGER", nullable: false),
                    TotalPoints = table.Column<int>(type: "INTEGER", nullable: false),
                    RiskPercent = table.Column<string>(type: "TEXT", nullable: false),
                    HeartAge = table.Column<string>(type: "TEXT", nullable: false),
                    Level = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assessments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_CreatedAt",
                table: "Assessments",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Assessments");
        }
    }
}
