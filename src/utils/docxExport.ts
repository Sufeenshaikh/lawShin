import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from 'docx';
import { AdvocateDraft } from '../types.js';

/**
 * Professional Microsoft Word (.docx) generator for Indian Legal Pleadings and Documents.
 * Formats court details, case parties, numbered paragraphs, verified authorities, and signature blocks.
 */
export async function exportDraftToDocx(draft: AdvocateDraft): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // 1. Top Formal Heading / Court Details
  const courtText = draft.courtDetails || 'IN THE HON\'BLE COURT OF COMPETENT JURISDICTION';
  const jurisdictionText = draft.jurisdiction ? `AT ${draft.jurisdiction.toUpperCase()}` : '';

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: courtText.toUpperCase(),
          bold: true,
          font: 'Times New Roman',
          size: 26, // 13pt
        }),
      ],
    })
  );

  if (jurisdictionText) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: jurisdictionText,
            bold: true,
            font: 'Times New Roman',
            size: 24, // 12pt
          }),
        ],
      })
    );
  }

  // 2. Case Number / Matter Header
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: draft.caseNumber ? `CASE / CNR NO: ${draft.caseNumber}` : 'CASE NO: [INFORMATION REQUIRED: CNR / FILING NO]',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );

  // 3. Cause Title / Parties (Between... And...)
  const petitioner = draft.clientName ? draft.clientName.toUpperCase() : '[PETITIONER / APPLICANT NAME]';
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'IN THE MATTER OF:',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${petitioner} ... PETITIONER / APPLICANT`,
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'VERSUS',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'STATE OF NCT OF DELHI & ANR. ... RESPONDENT(S)',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );

  // 4. Document Title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 280 },
      children: [
        new TextRun({
          text: draft.title.toUpperCase(),
          bold: true,
          underline: {},
          font: 'Times New Roman',
          size: 26,
        }),
      ],
    })
  );

  // 5. Statutory Provisions
  if (draft.relevantSections && draft.relevantSections.length > 0) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: `(UNDER ${draft.relevantSections.join(', ').toUpperCase()})`,
            italics: true,
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );
  }

  // 6. Mandatory AI & Verification Notice
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: 'MOST RESPECTFULLY SHOWETH:',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );

  // 7. Body Paragraphs (Splits by newline, numbers or preserves clean legal paragraphs)
  const lines = draft.content.split('\n');
  let paragraphCount = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    // Check if line looks like a heading
    const isHeading =
      line.startsWith('#') ||
      line.toUpperCase() === line && line.length < 60 && !line.match(/^\d+\./) ||
      line.startsWith('PRAYER') ||
      line.startsWith('VERIFICATION');

    const cleanLine = line.replace(/^#+\s*/, '');

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: cleanLine,
              bold: true,
              underline: {},
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );
    } else {
      // Normal paragraph
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 80, after: 120, line: 360 }, // 1.5 line spacing
          indent: { firstLine: 720 }, // 0.5 inch indent
          children: [
            new TextRun({
              text: cleanLine,
              font: 'Times New Roman',
              size: 24, // 12pt
            }),
          ],
        })
      );
    }
  }

  // 8. Verified Judicial Authorities Citations Block (if present)
  if (draft.authorities && draft.authorities.length > 0) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 140 },
        children: [
          new TextRun({
            text: 'RELIED UPON JUDICIAL PRECEDENTS & AUTHORITIES',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    draft.authorities.forEach((auth, idx) => {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: `${idx + 1}. ${auth.caseName} `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: `(${auth.citation}, ${auth.court} [${auth.decisionDate}])`,
              italics: true,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );

      if (auth.relevantPassage) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 40, after: 100 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: `"${auth.relevantPassage}"`,
                italics: true,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
          })
        );
      }
    });
  }

  // 9. Prayer Block
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 140 },
      children: [
        new TextRun({
          text: 'PRAYER',
          bold: true,
          underline: {},
          font: 'Times New Roman',
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 360 },
      indent: { firstLine: 720 },
      children: [
        new TextRun({
          text: 'In light of the facts, grounds, statutory provisions, and verified precedents cited above, it is most respectfully prayed that this Hon\'ble Court may graciously be pleased to pass necessary orders in the interest of justice.',
          font: 'Times New Roman',
          size: 24,
        }),
      ],
    })
  );

  // 10. Signature & Endorsement Block
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400, after: 80 },
      children: [
        new TextRun({
          text: 'FILED BY:',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `ADV. ${draft.lawyerName.toUpperCase()}`,
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'COUNSEL FOR THE PETITIONER / APPLICANT',
          font: 'Times New Roman',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'ENROLMENT NO: [AS PER BAR COUNCIL RECORDS]',
          font: 'Times New Roman',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `DATE: ${new Date().toLocaleDateString('en-IN')}`,
          font: 'Times New Roman',
          size: 20,
        }),
      ],
    })
  );

  // 11. Verification / Affidavit Clause
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: 'VERIFICATION',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240, line: 360 },
      children: [
        new TextRun({
          text: 'Verified at [PLACE] on this [DAY] day of [MONTH], [YEAR] that the contents of the above application/petition are true and correct to the best of my knowledge and belief derived from official records, and nothing material has been concealed therefrom.',
          italics: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: 'DEPONENT / APPLICANT',
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers file download in the browser.
 */
export function downloadDocxFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean printable PDF view for court documents.
 */
export function printDraftAsPdf(draft: AdvocateDraft) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please enable popups to download/print the court PDF document.');
    return;
  }

  const courtText = draft.courtDetails || 'IN THE HON\'BLE COURT OF COMPETENT JURISDICTION';
  const petitioner = draft.clientName || 'PETITIONER / APPLICANT';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${draft.title}</title>
        <style>
          @page {
            size: A4;
            margin: 25mm 20mm 25mm 25mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 13pt;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 20px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .underline { text-decoration: underline; }
          .italic { font-style: italic; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-6 { margin-top: 24px; }
          .mt-8 { margin-top: 32px; }
          .indent { text-indent: 40px; }
          .header-box {
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            font-size: 9pt;
            border: 1px solid #666;
            padding: 2px 6px;
            margin-bottom: 8px;
          }
          .authority-item {
            margin-left: 20px;
            margin-bottom: 8px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-family: sans-serif; font-size: 12px;">
          <strong>Advocate Review Copy:</strong> Use the browser's Print dialog to "Save as PDF" with standard A4 court margins.
          <button onclick="window.print()" style="margin-left: 12px; padding: 6px 14px; background: #0f172a; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
            Print / Save to PDF
          </button>
        </div>

        <div class="text-center font-bold uppercase mb-4" style="font-size: 15pt;">
          ${courtText}
        </div>
        ${draft.jurisdiction ? `<div class="text-center font-bold uppercase mb-4">AT ${draft.jurisdiction}</div>` : ''}

        <div class="text-center font-bold mb-6">
          ${draft.caseNumber ? `CASE / CNR NO: ${draft.caseNumber}` : 'CASE NO: [INFORMATION REQUIRED: CNR / FILING NO]'}
        </div>

        <div class="mb-4">
          <div class="font-bold">IN THE MATTER OF:</div>
          <div class="font-bold">${petitioner.toUpperCase()} ... PETITIONER / APPLICANT</div>
          <div class="text-center font-bold my-2" style="margin: 8px 0;">VERSUS</div>
          <div class="font-bold">STATE OF NCT OF DELHI & ANR. ... RESPONDENT(S)</div>
        </div>

        <div class="text-center font-bold uppercase underline mb-4" style="font-size: 14pt; margin-top: 24px;">
          ${draft.title}
        </div>

        ${
          draft.relevantSections && draft.relevantSections.length > 0
            ? `<div class="text-center font-bold italic mb-6">(UNDER ${draft.relevantSections.join(', ').toUpperCase()})</div>`
            : ''
        }

        <div class="font-bold mb-4">MOST RESPECTFULLY SHOWETH:</div>

        <div class="text-justify mb-6">
          ${draft.content
            .split('\n')
            .filter((p) => p.trim().length > 0)
            .map((p) => `<p class="indent" style="margin-bottom: 12px;">${p.trim()}</p>`)
            .join('')}
        </div>

        ${
          draft.authorities && draft.authorities.length > 0
            ? `
            <div class="mt-6 mb-4">
              <div class="font-bold underline mb-2">RELIED UPON JUDICIAL PRECEDENTS & AUTHORITIES:</div>
              ${draft.authorities
                .map(
                  (a, idx) => `
                <div class="authority-item">
                  <strong>${idx + 1}. ${a.caseName}</strong> (${a.citation}, ${a.court} [${a.decisionDate}])
                  ${a.relevantPassage ? `<div class="italic text-justify" style="margin-top: 4px; font-size: 11pt;">"${a.relevantPassage}"</div>` : ''}
                </div>
              `
                )
                .join('')}
            </div>
          `
            : ''
        }

        <div class="text-center font-bold underline mt-6 mb-4">PRAYER</div>
        <div class="text-justify indent mb-6">
          In light of the facts, grounds, statutory provisions, and verified precedents cited above, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to pass necessary orders in the interest of justice.
        </div>

        <div class="text-right mt-8" style="margin-top: 40px;">
          <div class="font-bold">FILED BY:</div>
          <div class="font-bold">ADV. ${draft.lawyerName.toUpperCase()}</div>
          <div>COUNSEL FOR THE PETITIONER / APPLICANT</div>
          <div>BAR COUNCIL ENROLMENT NO: [VERIFIED ENROLMENT]</div>
          <div>DATE: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>

        <div class="mt-8 pt-6" style="border-top: 1px dashed #666; margin-top: 40px;">
          <div class="text-center font-bold mb-2">VERIFICATION</div>
          <div class="text-justify italic" style="font-size: 11pt;">
            Verified at [PLACE] on this ${new Date().getDate()} day of ${new Date().toLocaleString('en-IN', { month: 'long' })}, ${new Date().getFullYear()} that the contents of the above application/petition are true and correct to the best of my knowledge and belief derived from official records, and nothing material has been concealed therefrom.
          </div>
          <div class="text-right font-bold mt-6" style="margin-top: 30px;">
            DEPONENT / APPLICANT
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
