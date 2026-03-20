const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../database');

const parseJSON = (str) => { try { return JSON.parse(str); } catch { return str || ''; } };

const statusColors = {
  passed: '27AE60', failed: 'E74C3C', pending: 'F39C12',
  blocked: '8E44AD', skipped: '95A5A6',
  open: 'E74C3C', in_progress: 'F39C12', resolved: '27AE60', closed: '95A5A6'
};

const severityColors = {
  critical: 'C0392B', high: 'E74C3C', medium: 'F39C12', low: '27AE60'
};

// ── EXPORT TEST CASES ────────────────────────────────────────────
router.get('/test-cases/:format', (req, res) => {
  try {
    const { format } = req.params;
    const rows = db.prepare('SELECT * FROM test_cases ORDER BY created_at DESC').all();
    const data = rows.map(r => ({ ...r, steps: parseJSON(r.steps), tags: parseJSON(r.tags) }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="test-cases.json"');
      return res.json(data);
    }

    if (format === 'csv') {
      const headers = 'ID,Título,Descrição,Precondições,Passos,Resultado Esperado,Resultado Atual,Status,Prioridade,Severidade,Categoria,Responsável,Ambiente,Versão,Criado em\n';
      const csvRows = data.map(r =>
        [r.id, r.title, r.description, r.preconditions,
          Array.isArray(r.steps) ? r.steps.join(' | ') : r.steps,
          r.expected_result, r.actual_result, r.status, r.priority,
          r.severity, r.category, r.assigned_to, r.environment,
          r.version, r.created_at
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename="test-cases.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF' + headers + csvRows);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'QA Manager';
      const ws = wb.addWorksheet('Casos de Teste');

      ws.columns = [
        { header: 'ID',                 key: 'id',              width: 38 },
        { header: 'Título',             key: 'title',           width: 30 },
        { header: 'Descrição',          key: 'description',     width: 35 },
        { header: 'Precondições',       key: 'preconditions',   width: 30 },
        { header: 'Passos',             key: 'steps',           width: 40 },
        { header: 'Resultado Esperado', key: 'expected_result', width: 30 },
        { header: 'Resultado Atual',    key: 'actual_result',   width: 30 },
        { header: 'Status',             key: 'status',          width: 14 },
        { header: 'Prioridade',         key: 'priority',        width: 14 },
        { header: 'Severidade',         key: 'severity',        width: 14 },
        { header: 'Categoria',          key: 'category',        width: 18 },
        { header: 'Responsável',        key: 'assigned_to',     width: 20 },
        { header: 'Ambiente',           key: 'environment',     width: 18 },
        { header: 'Versão',             key: 'version',         width: 12 },
        { header: 'Criado em',          key: 'created_at',      width: 22 }
      ];

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FF2980B9' } } };
      });
      headerRow.height = 30;

      data.forEach((r, i) => {
        const stepsText = Array.isArray(r.steps)
          ? r.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
          : r.steps;

        const row = ws.addRow({
          ...r,
          steps: stepsText,
          tags: Array.isArray(r.tags) ? r.tags.join(', ') : r.tags
        });

        row.height = 60;
        row.eachCell(cell => {
          cell.alignment = { wrapText: true, vertical: 'top' };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
        });

        const bg = i % 2 === 0 ? 'FFFAFAFA' : 'FFF5F5F5';
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        });

        const statusCell = row.getCell(8);
        const color = statusColors[r.status] || '95A5A6';
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
        statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ws.autoFilter = { from: 'A1', to: 'O1' };
      res.setHeader('Content-Disposition', 'attachment; filename="test-cases.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return wb.xlsx.write(res).then(() => res.end());
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      res.setHeader('Content-Disposition', 'attachment; filename="test-cases.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.rect(0, 0, doc.page.width, 80).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('QA Manager', 50, 20);
      doc.fontSize(12).font('Helvetica').text('Relatório de Casos de Teste', 50, 48);
      doc.fontSize(9).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 50, 64);
      doc.moveDown(3);

      data.forEach((r, idx) => {
        if (idx > 0 && doc.y > doc.page.height - 200) doc.addPage();

        const startY = doc.y + 10;
        doc.rect(45, startY, doc.page.width - 90, 24).fill('#2C3E50');
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
          .text(`#${idx + 1} — ${r.title}`, 55, startY + 7);
        doc.moveDown(0.2);

        const fields = [
          ['Status', r.status], ['Prioridade', r.priority],
          ['Severidade', r.severity], ['Categoria', r.category],
          ['Responsável', r.assigned_to], ['Ambiente', r.environment],
          ['Versão', r.version]
        ];

        doc.fillColor('#555555').fontSize(9).font('Helvetica');
        fields.forEach(([k, v]) => { if (v) doc.text(`${k}: ${v}`, 55); });

        if (r.description) {
          doc.moveDown(0.3);
          doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9).text('Descrição:');
          doc.font('Helvetica').fillColor('#555555').text(r.description, { indent: 10 });
        }

        if (r.preconditions) {
          doc.moveDown(0.3);
          doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9).text('Precondições:');
          doc.font('Helvetica').fillColor('#555555').text(r.preconditions, { indent: 10 });
        }

        if (Array.isArray(r.steps) && r.steps.length > 0) {
          doc.moveDown(0.3);
          doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9).text('Passos:');
          r.steps.forEach((step, i) => {
            doc.font('Helvetica').fillColor('#555555').text(`${i + 1}. ${step}`, { indent: 10 });
          });
        }

        if (r.expected_result) {
          doc.moveDown(0.3);
          doc.fillColor('#27AE60').font('Helvetica-Bold').fontSize(9).text('Resultado Esperado:');
          doc.font('Helvetica').fillColor('#555555').text(r.expected_result, { indent: 10 });
        }

        if (r.actual_result) {
          doc.moveDown(0.3);
          doc.fillColor('#E74C3C').font('Helvetica-Bold').fontSize(9).text('Resultado Atual:');
          doc.font('Helvetica').fillColor('#555555').text(r.actual_result, { indent: 10 });
        }

        doc.moveDown(1.5);
        doc.rect(45, doc.y - 5, doc.page.width - 90, 1).fill('#E0E0E0');
        doc.moveDown(0.5);
      });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#999999').fontSize(8).font('Helvetica')
          .text(`Página ${i + 1} de ${pages.count}`, 50, doc.page.height - 30, { align: 'center' });
      }

      doc.end();
      return;
    }

    res.status(400).json({ error: 'Formato inválido. Use: json, csv, excel ou pdf' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXPORT BUG REPORTS ───────────────────────────────────────────
router.get('/bug-reports/:format', (req, res) => {
  try {
    const { format } = req.params;
    const rows = db.prepare('SELECT * FROM bug_reports ORDER BY created_at DESC').all();
    const data = rows.map(r => ({
      ...r,
      steps_to_reproduce: parseJSON(r.steps_to_reproduce),
      tags: parseJSON(r.tags)
    }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="bug-reports.json"');
      return res.json(data);
    }

    if (format === 'csv') {
      const headers = 'ID,Título,Descrição,Passos para Reproduzir,Resultado Esperado,Resultado Atual,Severidade,Prioridade,Status,Ambiente,Browser,SO,Versão,Responsável,Reportado por,Criado em\n';
      const csvRows = data.map(r =>
        [r.id, r.title, r.description,
          Array.isArray(r.steps_to_reproduce) ? r.steps_to_reproduce.join(' | ') : r.steps_to_reproduce,
          r.expected_result, r.actual_result, r.severity, r.priority,
          r.status, r.environment, r.browser, r.os, r.version,
          r.assigned_to, r.reported_by, r.created_at
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename="bug-reports.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF' + headers + csvRows);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Bug Reports');

      ws.columns = [
        { header: 'ID',                    key: 'id',                  width: 38 },
        { header: 'Título',                key: 'title',               width: 30 },
        { header: 'Descrição',             key: 'description',         width: 35 },
        { header: 'Passos p/ Reproduzir',  key: 'steps_to_reproduce',  width: 40 },
        { header: 'Resultado Esperado',    key: 'expected_result',     width: 28 },
        { header: 'Resultado Atual',       key: 'actual_result',       width: 28 },
        { header: 'Severidade',            key: 'severity',            width: 14 },
        { header: 'Prioridade',            key: 'priority',            width: 14 },
        { header: 'Status',                key: 'status',              width: 14 },
        { header: 'Ambiente',              key: 'environment',         width: 18 },
        { header: 'Browser',               key: 'browser',             width: 16 },
        { header: 'SO',                    key: 'os',                  width: 14 },
        { header: 'Versão',                key: 'version',             width: 12 },
        { header: 'Responsável',           key: 'assigned_to',         width: 20 },
        { header: 'Reportado por',         key: 'reported_by',         width: 20 },
        { header: 'Criado em',             key: 'created_at',          width: 22 }
      ];

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B241C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      headerRow.height = 30;

      data.forEach((r, i) => {
        const stepsText = Array.isArray(r.steps_to_reproduce)
          ? r.steps_to_reproduce.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
          : r.steps_to_reproduce;

        const row = ws.addRow({ ...r, steps_to_reproduce: stepsText });
        row.height = 60;
        row.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'top' }; });

        const bg = i % 2 === 0 ? 'FFFAFAFA' : 'FFF5F5F5';
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        });

        const sevCell = row.getCell(7);
        const sevColor = severityColors[r.severity] || '95A5A6';
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sevColor } };
        sevCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sevCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const statusCell = row.getCell(9);
        const stColor = statusColors[r.status] || '95A5A6';
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + stColor } };
        statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ws.autoFilter = { from: 'A1', to: 'P1' };
      res.setHeader('Content-Disposition', 'attachment; filename="bug-reports.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return wb.xlsx.write(res).then(() => res.end());
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      res.setHeader('Content-Disposition', 'attachment; filename="bug-reports.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.rect(0, 0, doc.page.width, 80).fill('#7B241C');
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('QA Manager', 50, 20);
      doc.fontSize(12).font('Helvetica').text('Relatório de Bug Reports', 50, 48);
      doc.fontSize(9).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 50, 64);
      doc.moveDown(3);

      data.forEach((r, idx) => {
        if (idx > 0 && doc.y > doc.page.height - 200) doc.addPage();

        const sevColor = { critical: '#C0392B', high: '#E74C3C', medium: '#F39C12', low: '#27AE60' };
        const headerColor = sevColor[r.severity] || '#7B241C';

        const startY = doc.y + 10;
        doc.rect(45, startY, doc.page.width - 90, 24).fill(headerColor);
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
          .text(`#${idx + 1} — ${r.title}`, 55, startY + 7);
        doc.moveDown(0.2);

        const fields = [
          ['Severidade', r.severity], ['Prioridade', r.priority],
          ['Status', r.status], ['Ambiente', r.environment],
          ['Browser', r.browser], ['SO', r.os],
          ['Versão', r.version], ['Responsável', r.assigned_to],
          ['Reportado por', r.reported_by]
        ];

        doc.fillColor('#555555').fontSize(9).font('Helvetica');
        fields.forEach(([k, v]) => { if (v) doc.text(`${k}: ${v}`, 55); });

        if (r.description) {
          doc.moveDown(0.3);
          doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9).text('Descrição:');
          doc.font('Helvetica').fillColor('#555555').text(r.description, { indent: 10 });
        }

        const steps = Array.isArray(r.steps_to_reproduce) ? r.steps_to_reproduce : [];
        if (steps.length > 0) {
          doc.moveDown(0.3);
          doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9).text('Passos para Reproduzir:');
          steps.forEach((s, i) => {
            doc.font('Helvetica').fillColor('#555555').text(`${i + 1}. ${s}`, { indent: 10 });
          });
        }

        if (r.expected_result) {
          doc.moveDown(0.3);
          doc.fillColor('#27AE60').font('Helvetica-Bold').fontSize(9).text('Resultado Esperado:');
          doc.font('Helvetica').fillColor('#555555').text(r.expected_result, { indent: 10 });
        }

        if (r.actual_result) {
          doc.moveDown(0.3);
          doc.fillColor('#E74C3C').font('Helvetica-Bold').fontSize(9).text('Resultado Atual:');
          doc.font('Helvetica').fillColor('#555555').text(r.actual_result, { indent: 10 });
        }

        doc.moveDown(1.5);
        doc.rect(45, doc.y - 5, doc.page.width - 90, 1).fill('#E0E0E0');
        doc.moveDown(0.5);
      });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#999999').fontSize(8).font('Helvetica')
          .text(`Página ${i + 1} de ${pages.count}`, 50, doc.page.height - 30, { align: 'center' });
      }

      doc.end();
      return;
    }

    res.status(400).json({ error: 'Formato inválido. Use: json, csv, excel ou pdf' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXPORT TEST PLANS ────────────────────────────────────────────
router.get('/test-plans/:format', (req, res) => {
  try {
    const { format } = req.params;
    const rows = db.prepare('SELECT * FROM test_plans ORDER BY created_at DESC').all();
    const data = rows.map(r => ({ ...r, tags: parseJSON(r.tags) }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="test-plans.json"');
      return res.json(data);
    }

    if (format === 'csv') {
      const headers = 'ID,Título,Descrição,Objetivo,Escopo,Fora do Escopo,Ambiente,Data Início,Data Fim,Status,Versão,Criado por,Aprovado por,Criado em\n';
      const csvRows = data.map(r =>
        [r.id, r.title, r.description, r.objective, r.scope, r.out_of_scope,
          r.environment, r.start_date, r.end_date, r.status, r.version,
          r.created_by, r.approved_by, r.created_at
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename="test-plans.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF' + headers + csvRows);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Planos de Teste');

      ws.columns = [
        { header: 'ID',             key: 'id',           width: 38 },
        { header: 'Título',         key: 'title',        width: 30 },
        { header: 'Descrição',      key: 'description',  width: 35 },
        { header: 'Objetivo',       key: 'objective',    width: 35 },
        { header: 'Escopo',         key: 'scope',        width: 30 },
        { header: 'Fora do Escopo', key: 'out_of_scope', width: 30 },
        { header: 'Ambiente',       key: 'environment',  width: 18 },
        { header: 'Data Início',    key: 'start_date',   width: 14 },
        { header: 'Data Fim',       key: 'end_date',     width: 14 },
        { header: 'Status',         key: 'status',       width: 14 },
        { header: 'Versão',         key: 'version',      width: 12 },
        { header: 'Criado por',     key: 'created_by',   width: 20 },
        { header: 'Aprovado por',   key: 'approved_by',  width: 20 },
        { header: 'Criado em',      key: 'created_at',   width: 22 }
      ];

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      headerRow.height = 30;

      data.forEach((r, i) => {
        const row = ws.addRow(r);
        row.height = 50;
        row.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'top' }; });

        const bg = i % 2 === 0 ? 'FFFAFAFA' : 'FFF5F5F5';
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        });

        const stColors = { draft: 'F39C12', active: '27AE60', completed: '2980B9', archived: '95A5A6' };
        const statusCell = row.getCell(10);
        const stColor = stColors[r.status] || '95A5A6';
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + stColor } };
        statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ws.autoFilter = { from: 'A1', to: 'N1' };
      res.setHeader('Content-Disposition', 'attachment; filename="test-plans.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return wb.xlsx.write(res).then(() => res.end());
    }

    res.status(400).json({ error: 'Formato inválido. Use: json, csv ou excel' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXPORT SCRIPTS ───────────────────────────────────────────────
router.get('/scripts/:format', (req, res) => {
  try {
    const { format } = req.params;
    const rows = db.prepare('SELECT * FROM scripts ORDER BY created_at DESC').all();
    const data = rows.map(r => ({ ...r, tags: parseJSON(r.tags) }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="scripts.json"');
      return res.json(data);
    }

    if (format === 'csv') {
      const headers = 'ID,Título,Descrição,Linguagem,Framework,Código,Tags,Criado em\n';
      const csvRows = data.map(r =>
        [r.id, r.title, r.description, r.language, r.framework,
          r.code, Array.isArray(r.tags) ? r.tags.join('; ') : r.tags, r.created_at
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename="scripts.csv"');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF' + headers + csvRows);
    }

    res.status(400).json({ error: 'Formato inválido. Use: json ou csv' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;