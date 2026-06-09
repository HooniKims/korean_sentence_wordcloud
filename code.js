const CONFIG = {
  classTabs: ["1반", "2반", "3반", "4반", "5반", "6반"],
  headers: [
    "학번",
    "이름",
    "잠금",
    "제출 일시",
    "수정 일시",
    "입력 문장",
    "AI 분석 JSON",
    "학생 선택 JSON",
    "정답 JSON",
    "채점 JSON",
    "점수",
    "오답 요약",
    "워드클라우드 JSON",
    "이미지 생성 프롬프트"
  ],
  rowHeight: 28,
  columnWidths: [72, 90, 58, 150, 150, 180, 110, 110, 110, 110, 58, 140, 120, 180]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("품사 활동")
    .addItem("반별 탭 준비", "prepareClassTabs")
    .addItem("모든 반 학번순 정렬", "sortAllClassTabs")
    .addToUi();
}

function prepareClassTabs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "반별 탭 다시 만들기",
    "기존 반별 탭의 모든 내용을 지우고 새로 만듭니다. 계속할까요?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  CONFIG.classTabs.forEach((className) => {
    const sheet = getOrCreateSheet_(spreadsheet, className);
    sheet.clear();
    setupHeader_(sheet);
  });

  ui.alert("반별 탭을 새로 만들었습니다.");
}

function sortAllClassTabs() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  CONFIG.classTabs.forEach((className) => {
    const sheet = spreadsheet.getSheetByName(className);
    if (sheet) {
      sortSheetByStudentNumber_(sheet);
    }
  });

  SpreadsheetApp.getUi().alert("모든 반을 학번순으로 정렬했습니다.");
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function setupHeader_(sheet) {
  sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONFIG.headers.length).setFontWeight("bold").setBackground("#f1f5f9").setWrap(true);
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("B:B").setNumberFormat("@");
  sheet.getRange("C:C").setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["FALSE", "TRUE"], true).build()
  );

  formatCompactRows_(sheet);
}

function sortSheetByStudentNumber_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    return;
  }

  sheet
    .getRange(2, 1, lastRow - 1, CONFIG.headers.length)
    .sort([
      { column: 1, ascending: true },
      { column: 2, ascending: true }
    ]);
  formatCompactRows_(sheet);
}

function formatCompactRows_(sheet) {
  CONFIG.headers.forEach((header, index) => {
    const width = CONFIG.columnWidths[index] || Math.max(72, Math.min(220, header.length * 14 + 24));
    sheet.setColumnWidth(index + 1, width);
  });

  const maxRows = sheet.getMaxRows();
  if (maxRows >= 2) {
    const dataRange = sheet.getRange(2, 1, maxRows - 1, CONFIG.headers.length);
    dataRange.setVerticalAlignment("middle");
    if (SpreadsheetApp.WrapStrategy && SpreadsheetApp.WrapStrategy.CLIP) {
      dataRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    } else {
      dataRange.setWrap(false);
    }
    sheet.setRowHeights(2, maxRows - 1, CONFIG.rowHeight);
  }
}
