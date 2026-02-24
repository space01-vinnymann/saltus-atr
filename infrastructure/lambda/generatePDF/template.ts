import _ from 'lodash'

interface TemplateParams {
  RiskRating: string
  RiskQuestionsString: string
  RiskAnswersString: string
  date: string
}

const riskLabels: Record<string, { label: string; description: string }> = {
  '1': {
    label: 'Lower',
    description:
      "You're likely to be more conservative with your investments and understand that there may be some short-term changes in value to get potentially modest or relatively stable returns.",
  },
  '2': {
    label: 'Lower-Medium',
    description:
      "You're relatively cautious with your investments. You want the potential of getting reasonable long-term returns and are prepared to accept some risk in doing so. You understand there may be some frequent but small changes in value.",
  },
  '3': {
    label: 'Medium',
    description:
      "You have a balanced approach to risk. You don't look for risky investments, but you don't avoid them either. You're prepared to accept fluctuations in the value of your investments to try and get potentially better long-term returns. You understand that the value of your investments might change frequently and sometimes significantly.",
  },
  '4': {
    label: 'Medium-Higher',
    description:
      "You're comfortable taking some investment risk to get potentially better higher long-term returns, even if that means there might be times when you're getting potentially lower returns. You understand the value of your investments are likely to change frequently and often significantly.",
  },
  '5': {
    label: 'Higher',
    description:
      "You're very comfortable taking investment risk. You're aiming for potentially high long-term returns and are less concerned if the value of your investments go up and down over the short or medium term. You understand that the value of your investments is likely to change very frequently and significantly.",
  },
}

const saltusLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 995 246" fill="currentColor">
  <path d="M452.6,205.2c-6.4,4.3-11,7-17.7,7c-15.1,0-21.5-10.7-21.5-25.8c0-16.5,7.3-22.3,18.6-27l20.6-8.1V205.2z M575.9,208.1V8h-7.5l-55.7,13.6v7.3l16.8,8.7v159.7c0,8,1.1,16.4-11.3,22.7c-3.3,1.5-6.4,2.3-10.7,2.3c-7.3,0-8.7-6.1-8.7-14.5 v-81.5c0-36-22.3-49-60.9-49c-33.6,0-59.7,12.2-59.7,37.4c0,9.9,5.5,16.5,13.6,19.1l27.9-3.8c-1.7-6.7-2.6-12.8-2.6-18.9 c0-13.9,5.2-23.8,17.7-23.8c13.3,0,18,10.4,18,25.5v27l-45,16c-21.2,7.8-38.9,18-38.9,43.2c0,24.1,16.2,38.3,40.3,38.3 c20.9,0,35.4-12.2,44.4-24.4c3.8,15.7,14.8,24.9,31,24.9c4.7,0,9.1-0.7,13.2-2c3-1.1,7.7-0.9,7.7-0.9h5.6h83.8v-13.5 C582.1,220.7,575.9,217.7,575.9,208.1 M844.2,203.2v-90.5l1.7-33.6h-8.1L781,88v9.9l4.3,0.9c10.4,2.3,12.5,9.1,12.5,18.1v85.6 c-8.7,4.6-16,8.4-26.1,8.4c-15.1,0-21.2-9.6-21.2-25.8v-71.6l1.4-34.1h-7.8l-90.5,6.1V41.6h-9.9c-13.6,19.4-32.8,39.1-54.2,48v8.1 h17.4v94.1c0,33.4,18,46.1,42.9,46.1c22,0,37.4-10.4,47.6-26.7l-4-5.8c-7,5.2-13.6,7.8-21.2,7.8c-12.5,0-18.6-6.7-18.6-22.6V97.8 l37.7,0.1c10.4,0,12.5,9.9,12.5,18.9v73.4c0,33.1,17.1,47.8,42.9,47.8c24.4,0,39.7-14.5,51-27.8L797,238h8.4l56.8-10.1v-10.2l-7-0.3 C845.1,216.8,844.2,213.1,844.2,203.2 M935.1,133.9c-20.9-7.3-29.9-13.1-29.9-26.1c0-11.6,8.7-19.4,22.3-19.4 c20.3,0,32.8,16.8,36.8,36.8h11V90.1c-12.2-7.8-29-12.8-48.2-12.8c-33.6,0-56.8,17.4-56.8,48.4c0,27.9,16.8,40.9,48.4,51.3 c21.5,7.5,32.5,12.8,32.5,28.1c0,14.5-11.6,21.8-26.1,21.8c-22.3,0-37.4-18.6-43.5-42.9h-11.9l1.7,39.4 c11.9,8.7,30.5,14.5,53.7,14.5c37.1,0,61.2-18.6,61.2-50.8C986.5,157.1,967.9,145.2,935.1,133.9 M36.1,182.9 c-15.4,0-27.5,11.6-27.5,27.6S20.7,238,36.1,238c15.1,0,27.3-11.6,27.3-27.5S51.2,182.9,36.1,182.9 M296.4,108.1 c-30.5-10.4-42.1-18.3-42.1-38c0-17.4,12.5-28.7,31.6-28.7c27.6,0,43.5,18,49.6,48.2h12.2V45.7c-14.5-10.4-36.2-17.1-61.8-17.1 c-41.5,0-70.2,24.9-70.2,62.7c0,34.8,21.5,51.9,57.7,63.5c33.6,11.3,46.1,20,46.1,40c0,19.1-14.2,30.5-36.2,30.5 c-29.6,0-48.4-22.9-55.4-56.6h-13.6l2.6,50.2c13.3,10.7,38,19.1,66.4,19.1c41.8,0,76.3-20.6,76.3-63.2 C359.7,136.2,335.3,121.1,296.4,108.1 M103.8,182.9c-15.4,0-27.6,11.6-27.6,27.6S88.4,238,103.8,238c15.1,0,27.3-11.6,27.3-27.5 S118.8,182.9,103.8,182.9 M171.4,182.9c-15.4,0-27.6,11.6-27.6,27.6s12.2,27.5,27.6,27.5c15.1,0,27.3-11.6,27.3-27.5 S186.5,182.9,171.4,182.9"/>
</svg>`

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --foreground: #18263a;
      --coral: #f0645a;
      --green: #49796b;
      --muted-fg: #8c9097;
      --muted: #f0ece5;
      --surface: #FDFAF5;
      --panel: #FFFFFF;
      --border: #dddddd;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Roboto', sans-serif;
      color: var(--foreground);
      font-size: 12px;
      line-height: 1.5;
      background: var(--panel);
    }

    .page {
      page-break-after: always;
      padding: 40px;
      min-height: 100%;
    }
    .page:last-child { page-break-after: auto; }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }

    .logo { height: 24px; color: var(--coral); }
    .logo svg { height: 100%; width: auto; display: block; }

    .footer-logo { height: 16px; color: var(--muted-fg); }
    .footer-logo svg { height: 100%; width: auto; display: block; }

    .header-label {
      font-family: 'Roboto', sans-serif;
      font-size: 11px;
      font-weight: 500;
      color: var(--muted-fg);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Page 1 */
    .results-title {
      font-family: Georgia, serif;
      font-size: 28px;
      font-weight: bold;
      color: var(--foreground);
      margin-bottom: 4px;
    }

    .results-title-accent {
      font-family: Georgia, serif;
      font-size: 28px;
      font-weight: bold;
      color: var(--coral);
      margin-bottom: 24px;
    }

    .results-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin-bottom: 24px;
    }

    .rating-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid var(--coral);
      background: var(--muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .rating-number {
      font-family: Georgia, serif;
      font-size: 36px;
      font-weight: bold;
      color: var(--foreground);
      line-height: 1;
    }

    .rating-of {
      font-size: 11px;
      color: var(--muted-fg);
    }

    .rating-label {
      font-family: Georgia, serif;
      font-size: 22px;
      font-weight: bold;
      color: var(--foreground);
      margin-bottom: 8px;
    }

    .rating-description {
      font-size: 13px;
      line-height: 1.6;
      color: var(--muted-fg);
      max-width: 480px;
      margin: 0 auto 24px;
    }

    /* Risk scale bar */
    .scale-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }

    .scale-segment {
      flex: 1;
      height: 8px;
      border-radius: 9999px;
      background: var(--muted);
    }

    .scale-segment.below { background: var(--green); }
    .scale-segment.active { background: var(--coral); }

    .scale-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--muted-fg);
    }

    /* Info box */
    .info-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 12px;
      color: var(--foreground);
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .info-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      color: var(--coral);
    }

    .date-line {
      color: var(--muted-fg);
      font-size: 11px;
      margin-top: 16px;
    }

    /* Footer */
    .page-footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .footer-text {
      font-size: 10px;
      color: var(--muted-fg);
    }

    /* Pages 2 & 3 */
    .report-title {
      font-family: Georgia, serif;
      font-size: 20px;
      font-weight: bold;
      color: var(--foreground);
      margin-bottom: 4px;
    }

    .report-subtitle {
      font-size: 13px;
      color: var(--muted-fg);
      margin-bottom: 24px;
    }

    .question-list {
      list-style: none;
      padding: 0;
    }

    .question-item {
      margin-bottom: 18px;
      break-inside: avoid;
    }

    .question-number {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      color: var(--coral);
      margin-bottom: 4px;
    }

    .question-text {
      font-family: Georgia, serif;
      font-weight: normal;
      font-size: 13px;
      color: var(--foreground);
      margin-bottom: 6px;
    }

    .answer-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      margin: 3px 0;
      border-radius: 6px;
      font-size: 11px;
      color: var(--foreground);
      border: 1px solid transparent;
    }

    .answer-option.selected {
      background: rgba(240, 100, 90, 0.08);
      border-color: var(--coral);
    }

    .radio-circle {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--border);
      flex-shrink: 0;
    }

    .radio-circle.selected {
      border-color: var(--coral);
      background: var(--coral);
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
    }
  </style>
</head>
<body>
  <!-- Page 1: Results Summary -->
  <div class="page" style="display:flex;flex-direction:column;">
    <div class="page-header">
      <div class="logo">${saltusLogoSvg}</div>
      <span class="header-label">Risk Profile Report</span>
    </div>

    <div>
      <div class="results-title">Attitude to Risk</div>
      <div class="results-title-accent">Results</div>
    </div>

    <div class="results-card">
      <div class="rating-circle">
        <span class="rating-number"><%= RiskRating %></span>
        <span class="rating-of">of 5</span>
      </div>
      <div class="rating-label"><%= riskLabel %> Risk</div>
      <p class="rating-description"><%= riskDescription %></p>

      <div class="scale-bar">
        <% for (var i = 1; i <= 5; i++) { %>
          <div class="scale-segment<%= i < Number(RiskRating) ? ' below' : i == Number(RiskRating) ? ' active' : '' %>"></div>
        <% } %>
      </div>
      <div class="scale-labels">
        <span>Lower Risk</span>
        <span>Higher Risk</span>
      </div>
    </div>

    <div class="info-box">
      <svg class="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
      <span>Please email this document to your Financial Adviser so they can discuss your risk profile and recommend an appropriate investment strategy.</span>
    </div>

    <p class="date-line">Generated on <%= date %></p>

    <div style="flex:1;"></div>

    <div class="page-footer">
      <div class="footer-logo">${saltusLogoSvg}</div>
      <span class="footer-text">Attitude to Risk Questionnaire</span>
    </div>
  </div>

  <!-- Questions (flows naturally across pages) -->
  <div style="padding: 40px;">
    <div class="page-header">
      <div class="logo">${saltusLogoSvg}</div>
      <span class="header-label">Risk Profile Report</span>
    </div>

    <div class="report-title">Your Questions &amp; Answers</div>
    <div class="report-subtitle">13 questions</div>

    <ol class="question-list all-questions"></ol>

    <div class="page-footer" style="margin-top: 24px;">
      <div class="footer-logo">${saltusLogoSvg}</div>
      <span class="footer-text">Attitude to Risk Questionnaire</span>
    </div>
  </div>

  <script>
    (function() {
      var questionsData = JSON.parse('<%= RiskQuestionsString %>');
      var answersData = JSON.parse('<%= RiskAnswersString %>');

      var answersMap = {};
      answersData.forEach(function(a) {
        answersMap[a.questionId] = a.responseId;
      });

      function buildQuestionHtml(q, index) {
        var selectedId = answersMap[q.id];
        var html = '<li class="question-item">';
        html += '<span class="question-number">Question ' + index + '</span>';
        html += '<div class="question-text">' + q.text + '</div>';
        q.answers.forEach(function(a) {
          var isSelected = a.id === selectedId;
          html += '<div class="answer-option' + (isSelected ? ' selected' : '') + '">';
          html += '<div class="radio-circle' + (isSelected ? ' selected' : '') + '"></div>';
          html += '<span>' + a.text + '</span>';
          html += '</div>';
        });
        html += '</li>';
        return html;
      }

      var allHtml = '';
      var index = 1;
      questionsData.forEach(function(q) {
        allHtml += buildQuestionHtml(q, index);
        index++;
      });

      document.querySelector('.all-questions').innerHTML = allHtml;
    })();
  </script>
</body>
</html>`

export function compileTemplate(params: TemplateParams): string {
  const riskInfo = riskLabels[params.RiskRating] ?? { label: 'Unknown', description: '' }

  const compiled = _.template(htmlTemplate)
  return compiled({
    ...params,
    riskLabel: riskInfo.label,
    riskDescription: riskInfo.description,
  })
}
