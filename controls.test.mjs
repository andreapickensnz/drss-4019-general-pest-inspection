import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pages = [
	"DRSS-4019 General Pest Inspection - Datascape - v4.html",
	"DRSS-4019 General Pest Inspection - Fieldwork - v4.html"
];

for (const file of pages) {
	const html = fs.readFileSync(new URL(file, import.meta.url), "utf8");
	const controlFor = html.slice(html.indexOf("function controlFor(field)"), html.indexOf("/* ---------- controls ---------- */", html.indexOf("function controlFor(field)")));
	const sectionBuilder = html.slice(html.indexOf("function buildSection(section"), html.indexOf("function movesOnPhone"));
	const fieldDefinition = (id) => {
		const start = html.indexOf(`id: "${id}"`);
		const next = html.indexOf("id: \"", start + 1);
		return start === -1 ? "" : html.slice(start, next === -1 ? undefined : next);
	};

	test(`${file} uses the agreed selection controls`, () => {
		assert.ok(fieldDefinition("dataCollectedUsing").includes('type: "multiselect"'), "Data collected using stays multi-select");
		assert.ok(fieldDefinition("storedWhere").includes('type: "multiselect"'), "Survey-5 specifies multi-select storage");
		assert.ok(html.includes('field: "storedWhere", includes: "Council Database"'));
		assert.ok(html.includes('field: "storedWhere", includes: "External Database"'));
		assert.ok(html.includes('field: "storedWhere", includes: "Other"'));
		assert.ok(fieldDefinition("responsibility").includes("forceDropdown: true"), "Responsibility uses a dropdown on Fieldwork");
		assert.ok(fieldDefinition("complianceStatus").includes("forceDropdown: true"), "Compliance status uses a dropdown on Fieldwork");
	});

	test(`${file} is the Survey-5 v4 preview`, () => {
		assert.equal(fieldDefinition("inspectionDate"), "");
		assert.equal(fieldDefinition("dataLink"), "");
		assert.match(html, /General Pest Inspection v4/);
		assert.match(html, /Survey-5\.xlsx/);
		assert.match(html, /standard Survey Date mapping \{\{SurveyDate\}\}/);
		assert.match(html, /href="DRSS-4019%20General%20Pest%20Inspection%20-%20Datascape%20-%20v4\.html"/);
		assert.match(html, /href="DRSS-4019%20General%20Pest%20Inspection%20-%20Fieldwork%20-%20v4\.html"/);
		if (file.includes("Datascape")) {
			assert.match(html, /id="survey-date" type="date" required/);
			assert.match(html, /id="survey-time" type="time" aria-label/);
		}
	});

	test(`${file} renders multiselects as chip dropdowns and Yes/No as switches`, () => {
		assert.ok(controlFor.includes('return { mode: "toggle"'), "Yes/No selects a switch");
		assert.ok(controlFor.includes('return { mode: "dropdown"'), "multi-selects use the dropdown control");
		assert.ok(controlFor.includes("if (field.forceDropdown)"), "forced single-select dropdowns are respected");
		assert.ok(!controlFor.includes("Vertical checkboxes"), "multi-selects are not rendered as vertical checkbox groups");
		assert.ok(html.includes('const booleanSwitch = field.type === "boolean"'));
		assert.ok(html.includes('case "boolean": node = toggleControl(field, scope); break;'));
		assert.ok(html.includes('if (surface === "desk" || mode === "dropdown")'), "chip dropdown is available on both surfaces");
		assert.ok(html.includes('const details = el("details", "multi-dropdown")'));
		assert.ok(html.includes("details.append(summary, selectAll, list)"));
	});

	test(`${file} keeps subsection headings visible and parent sections collapsible`, () => {
		assert.match(sectionBuilder, /if \(depth === 0\) \{[\s\S]*?head\.appendChild\(collapseToggleControl\(false, section\.name\)\);[\s\S]*?head\.addEventListener\("click"/,
			"only top-level sections render hide controls and collapse handlers");
		assert.ok(sectionBuilder.includes('depth === 0 ? "button" : "div"'), "subsection headings are not buttons");
		assert.ok(html.includes('head.appendChild(collapseToggleControl(false, part.name))'), "parent sections retain their hide controls");
	});
}