/**
 * Google Apps Script - 즐겨찾기 기능
 *
 * 이 코드를 기존 Apps Script에 추가하세요.
 * Google Sheets에 "즐겨찾기" 시트를 생성해야 합니다.
 *
 * 시트 구조:
 * A열: email (사용자 이메일)
 * B열: serviceId (서비스 ID)
 * C열: serviceName (서비스명)
 * D열: createdAt (등록일시)
 */

// 즐겨찾기 시트명
const FAVORITES_SHEET_NAME = '즐겨찾기';

// doGet 함수에 즐겨찾기 조회 추가
// 기존 doGet 함수를 아래와 같이 수정하세요:
/*
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getFavorites') {
    return getFavoritesHandler(e);
  }

  if (action === 'getAllFavorites') {
    return getAllFavoritesHandler();
  }

  // 기존 서비스 데이터 반환 로직...
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: getServicesData()
  })).setMimeType(ContentService.MimeType.JSON);
}
*/

// doPost 함수에 즐겨찾기 추가/삭제 추가
// 기존 doPost 함수를 아래와 같이 수정하세요:
/*
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'addFavorite') {
    return addFavoriteHandler(data);
  }

  if (action === 'removeFavorite') {
    return removeFavoriteHandler(data);
  }

  // 기존 로직...
}
*/

// ============ 즐겨찾기 핸들러 함수들 ============

/**
 * 즐겨찾기 시트 가져오기 (없으면 생성)
 */
function getFavoritesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FAVORITES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FAVORITES_SHEET_NAME);
    // 헤더 추가
    sheet.getRange('A1:D1').setValues([['email', 'serviceId', 'serviceName', 'createdAt']]);
    sheet.getRange('A1:D1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 사용자의 즐겨찾기 목록 조회
 */
function getFavoritesHandler(e) {
  const email = e.parameter.email;
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'email 파라미터가 필요합니다'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getFavoritesSheet();
  const data = sheet.getDataRange().getValues();

  const favorites = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      favorites.push({
        email: data[i][0],
        serviceId: data[i][1],
        serviceName: data[i][2],
        createdAt: data[i][3]
      });
    }
  }

  // 최신순 정렬
  favorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    favorites: favorites
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 전체 즐겨찾기 통계 조회 (어드민용)
 */
function getAllFavoritesHandler() {
  const sheet = getFavoritesSheet();
  const data = sheet.getDataRange().getValues();

  const stats = {};

  for (let i = 1; i < data.length; i++) {
    const serviceId = data[i][1];
    const serviceName = data[i][2];
    const email = data[i][0];

    if (!stats[serviceId]) {
      stats[serviceId] = {
        serviceId: serviceId,
        serviceName: serviceName,
        count: 0,
        users: []
      };
    }

    stats[serviceId].count++;
    stats[serviceId].users.push(email);
  }

  // 배열로 변환하고 카운트 내림차순 정렬
  const statsArray = Object.values(stats).sort((a, b) => b.count - a.count);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    stats: statsArray
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 즐겨찾기 추가
 */
function addFavoriteHandler(data) {
  const { email, serviceId, serviceName } = data;

  if (!email || !serviceId) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'email과 serviceId가 필요합니다'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getFavoritesSheet();
  const existingData = sheet.getDataRange().getValues();

  // 중복 체크
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0].toLowerCase() === email.toLowerCase() &&
        existingData[i][1] === serviceId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: '이미 즐겨찾기에 추가되어 있습니다'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 새 행 추가
  const createdAt = new Date().toISOString();
  sheet.appendRow([email.toLowerCase(), serviceId, serviceName || serviceId, createdAt]);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: '즐겨찾기에 추가되었습니다'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 즐겨찾기 삭제
 */
function removeFavoriteHandler(data) {
  const { email, serviceId } = data;

  if (!email || !serviceId) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'email과 serviceId가 필요합니다'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getFavoritesSheet();
  const existingData = sheet.getDataRange().getValues();

  // 해당 행 찾아서 삭제
  for (let i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][0].toLowerCase() === email.toLowerCase() &&
        existingData[i][1] === serviceId) {
      sheet.deleteRow(i + 1); // 시트는 1-indexed
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: '즐겨찾기에서 삭제되었습니다'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============ 통합 예시 ============
/**
 * 아래는 기존 doGet/doPost와 통합한 전체 예시입니다.
 * 기존 코드에 맞게 수정해서 사용하세요.
 */

/*
function doGet(e) {
  const action = e.parameter.action;

  // 즐겨찾기 조회
  if (action === 'getFavorites') {
    return getFavoritesHandler(e);
  }

  // 전체 즐겨찾기 통계 (어드민용)
  if (action === 'getAllFavorites') {
    return getAllFavoritesHandler();
  }

  // 기존: 서비스 데이터 반환
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('비밀번호');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const services = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row.id = 'service-' + i;
    services.push(row);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: services
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // 즐겨찾기 추가
  if (action === 'addFavorite') {
    return addFavoriteHandler(data);
  }

  // 즐겨찾기 삭제
  if (action === 'removeFavorite') {
    return removeFavoriteHandler(data);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: '알 수 없는 action입니다'
  })).setMimeType(ContentService.MimeType.JSON);
}
*/
