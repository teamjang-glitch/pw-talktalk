/**
 * 비번톡톡 - Google Apps Script API
 *
 * 사용법:
 * 1. 스프레드시트에서 확장 프로그램 > Apps Script 열기
 * 2. 이 코드를 붙여넣기
 * 3. 배포 > 새 배포 > 웹 앱 선택
 * 4. 액세스 권한: "모든 사용자" 선택
 * 5. 배포 후 URL 복사
 */

// 설정: 시트 이름
const SHEET_NAME = '서비스데이터';

/**
 * GET 요청 처리 - 데이터 조회
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return createResponse({ error: '시트를 찾을 수 없습니다: ' + SHEET_NAME }, 404);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return createResponse({ data: [], message: '데이터가 없습니다.' });
    }

    // 첫 번째 행은 헤더
    const headers = data[0];
    const rows = data.slice(1);

    // 검색 파라미터 처리
    const searchQuery = e.parameter.q || e.parameter.search || '';

    // 데이터를 객체 배열로 변환
    let result = rows.map((row, index) => {
      const obj = { id: 'service-' + index };
      headers.forEach((header, i) => {
        // 헤더명을 영문 키로 매핑
        const key = mapHeaderToKey(header);
        obj[key] = row[i] || '';
      });
      return obj;
    });

    // 검색 필터링 (서비스명 또는 URL에서 검색)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.serviceName && item.serviceName.toLowerCase().includes(query)) ||
        (item.url && item.url.toLowerCase().includes(query))
      );
    }

    return createResponse({
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

/**
 * 한글 헤더를 영문 키로 매핑
 */
function mapHeaderToKey(header) {
  const headerStr = String(header).trim();
  const mapping = {
    '서비스명': 'serviceName',
    '서비스': 'serviceName',
    'URL': 'url',
    'url': 'url',
    '주소': 'url',
    'PW': 'password',
    'pw': 'password',
    '비밀번호': 'password',
    '패스워드': 'password',
    '용도': 'usage',
    '설명': 'usage',
    '비고': 'usage',
    '최종수정일': 'lastModified',
    '최종 수정일': 'lastModified',
    '수정일': 'lastModified',
    '업데이트': 'lastModified',
    'ID': 'accountId',
    'id': 'accountId',
    '아이디': 'accountId',
    '계정': 'accountId',
  };

  return mapping[headerStr] || headerStr.toLowerCase().replace(/\s+/g, '_');
}

/**
 * JSON 응답 생성
 */
function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * CORS 헤더를 위한 OPTIONS 요청 처리
 */
function doPost(e) {
  return doGet(e);
}
