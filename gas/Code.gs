function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 메인 시트 설정
  let mainSheet = ss.getSheetByName("Camps");
  if (!mainSheet) {
    mainSheet = ss.insertSheet("Camps");
  }
  
  const mainHeaders = [
    "프로그램 ID", "연동 도시 ID", "시즌 분류", "프로그램 명",
    "운영 기관", "모집/대행 기관", "운영 형태", "한국어 지원 수준",
    "참가 대상", "참가 형태", "프로그램 유형", "연령대 그룹",
    "정확한 일정", "숙소 옵션", "프로그램 비용", "대표 이미지 URL",
    "상세 페이지 링크", "커리큘럼 핵심 요약", "승인 상태"
  ];
  mainSheet.getRange(1, 1, 1, mainHeaders.length).setValues([mainHeaders]);
  mainSheet.getRange(1, 1, 1, mainHeaders.length).setFontWeight("bold");
  mainSheet.setFrozenRows(1);
  
  // 2. 로그 시트 설정
  let logSheet = ss.getSheetByName("Crawl_Log");
  if (!logSheet) {
    logSheet = ss.insertSheet("Crawl_Log");
  }
  
  const logHeaders = ["시간", "입력 조건", "수집 개수", "상태"];
  logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
  logSheet.getRange(1, 1, 1, logHeaders.length).setFontWeight("bold");
  logSheet.setFrozenRows(1);
  
  return { mainSheet, logSheet };
}

function doPost(e) {
  try {
    const { mainSheet, logSheet } = setupSheets();
    const data = JSON.parse(e.postData.contents);
    const { cityId, year, season, camps } = data;
    
    let addedCount = 0;
    
    if (camps && camps.length > 0) {
      // 기존 데이터 로드 (중복 체크용)
      const existingData = mainSheet.getDataRange().getValues();
      const existingUrls = existingData.slice(1).map(row => row[16]); // 상세 페이지 링크 (Q열 - 인덱스 16)
      
      const newRows = [];
      
      for (const camp of camps) {
        if (existingUrls.includes(camp.sourceUrl)) {
          continue; // 중복 스킵
        }
        
        // 프로그램 ID 생성
        const nextIndex = existingData.length + addedCount;
        const programId = `PROG-${year}-${cityId}-${nextIndex.toString().padStart(3, '0')}`;
        
        newRows.push([
          programId,
          cityId,
          `${year}_${season}`,
          camp.programName || "문의 필요",
          camp.place || "문의 필요",
          camp.seller || "문의 필요",
          camp.operationType || "문의 필요",
          camp.koreanSupport || "문의 필요",
          camp.targetAudience || "문의 필요",
          camp.participantType || "문의 필요",
          camp.programCategory || "문의 필요",
          camp.ageGroup || "문의 필요",
          camp.schedule || "문의 필요",
          camp.accommodation || "문의 필요",
          camp.cost || "문의 필요",
          camp.imageUrl || "default_camp.png",
          camp.sourceUrl || "문의 필요",
          camp.summary || "문의 필요",
          "대기" // 기본 승인 상태
        ]);
        addedCount++;
      }
      
      if (newRows.length > 0) {
        mainSheet.getRange(mainSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      }
    }
    
    // 로그 기록
    logSheet.appendRow([
      new Date(),
      `${cityId}, ${year}, ${season}`,
      addedCount,
      "성공"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      added: addedCount
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    const { logSheet } = setupSheets();
    logSheet.appendRow([new Date(), "N/A", 0, `에러: ${error.message}`]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getSheetByName("Camps");
  
  if (!mainSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Sheet not found"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = mainSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: result
  })).setMimeType(ContentService.MimeType.JSON);
}
