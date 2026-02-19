const PASSWORD_SHEET_NAME = '비밀번호';
const FAVORITES_SHEET_NAME = '즐겨찾기';

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getFavorites') {
      return getFavoritesHandler(e);
    }

    if (action === 'getAllFavorites') {
      return getAllFavoritesHandler();
    }

    return getServicesHandler();

  } catch (error) {
    return createErrorResponse(error.message);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'addFavorite') {
      return addFavoriteHandler(data);
    }

    if (action === 'removeFavorite') {
      return removeFavoriteHandler(data);
    }

    return createErrorResponse('Unknown action: ' + action);

  } catch (error) {
    return createErrorResponse(error.message);
  }
}

function getServicesHandler() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PASSWORD_SHEET_NAME);

  if (!sheet) {
    return createErrorResponse('Sheet not found: ' + PASSWORD_SHEET_NAME);
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return createJsonResponse({ success: true, data: [] });
  }

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

  return createJsonResponse({
    success: true,
    data: services
  });
}

function getFavoritesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FAVORITES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FAVORITES_SHEET_NAME);
    sheet.getRange('A1:D1').setValues([['email', 'serviceId', 'serviceName', 'createdAt']]);
    sheet.getRange('A1:D1').setFontWeight('bold');
    sheet.getRange('A1:D1').setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 180);
  }

  return sheet;
}

function getFavoritesHandler(e) {
  const email = e.parameter.email;

  if (!email) {
    return createErrorResponse('email parameter is required');
  }

  const sheet = getFavoritesSheet();
  const data = sheet.getDataRange().getValues();

  const favorites = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
      favorites.push({
        email: data[i][0],
        serviceId: data[i][1],
        serviceName: data[i][2],
        createdAt: data[i][3]
      });
    }
  }

  favorites.sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return createJsonResponse({
    success: true,
    favorites: favorites
  });
}

function getAllFavoritesHandler() {
  const sheet = getFavoritesSheet();
  const data = sheet.getDataRange().getValues();

  const stats = {};

  for (let i = 1; i < data.length; i++) {
    const email = data[i][0];
    const serviceId = data[i][1];
    const serviceName = data[i][2];

    if (!serviceId) continue;

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

  const statsArray = Object.values(stats).sort(function(a, b) {
    return b.count - a.count;
  });

  return createJsonResponse({
    success: true,
    stats: statsArray
  });
}

function addFavoriteHandler(data) {
  const email = data.email;
  const serviceId = data.serviceId;
  const serviceName = data.serviceName;

  if (!email || !serviceId) {
    return createErrorResponse('email and serviceId are required');
  }

  const sheet = getFavoritesSheet();
  const existingData = sheet.getDataRange().getValues();

  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0] &&
        existingData[i][0].toString().toLowerCase() === email.toLowerCase() &&
        existingData[i][1] === serviceId) {
      return createJsonResponse({
        success: true,
        message: 'Already exists'
      });
    }
  }

  const createdAt = new Date().toISOString();
  sheet.appendRow([email.toLowerCase(), serviceId, serviceName || serviceId, createdAt]);

  return createJsonResponse({
    success: true,
    message: 'Added'
  });
}

function removeFavoriteHandler(data) {
  const email = data.email;
  const serviceId = data.serviceId;

  if (!email || !serviceId) {
    return createErrorResponse('email and serviceId are required');
  }

  const sheet = getFavoritesSheet();
  const existingData = sheet.getDataRange().getValues();

  for (let i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][0] &&
        existingData[i][0].toString().toLowerCase() === email.toLowerCase() &&
        existingData[i][1] === serviceId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  return createJsonResponse({
    success: true,
    message: 'Removed'
  });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}
