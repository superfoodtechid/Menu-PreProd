/**
 * Google Apps Script Web App for FoodMaster Menu Outlet Drive Upload & Conversion.
 * 
 * Features:
 * - Dynamic Parent Folder resolution (reads folderId / parentFolderId / targetFolderId from payload,
 *   with fallback to DEFAULT_PARENT_FOLDER_ID)
 * - Auto-creates Owner / Outlet subfolder inside parent folder
 * - Uploads raw .xlsx binary file
 * - Converts .xlsx into native Google Sheet using Drive API v2 / v3
 * - Sets Google Sheet sharing permissions (ANYONE_WITH_LINK, VIEW)
 * - Returns JSON response with fileUrl & spreadsheetUrl
 */

// Default Parent Folder ID (Target Folder Baru)
var DEFAULT_PARENT_FOLDER_ID = "14EFVOjND6brFT6BKdXu5dWJBErbSMqie";

function doPost(e) {
  // LockService untuk mencegah race condition pembuataan folder ganda saat request bersamaan
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); // Tunggu hingga 30 detik

  try {
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName || "FoodMaster Exports";
    var fileName = data.fileName || "Export.xlsx";
    var fileContent = data.fileContent;
    var mimeType = data.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    
    // Dynamic Parent Folder ID resolution from request payload
    var targetFolderId = data.folderId || data.parentFolderId || data.targetFolderId || DEFAULT_PARENT_FOLDER_ID;

    var decoded = Utilities.base64Decode(fileContent);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // 1. Tentukan Parent Folder (menggunakan targetFolderId dinamis atau fallback ke root)
    var parentFolder;
    if (targetFolderId && targetFolderId.trim() !== "") {
      try {
        parentFolder = DriveApp.getFolderById(targetFolderId);
      } catch (errDrive) {
        console.warn("Folder ID tidak ditemukan, menggunakan Root Folder: " + errDrive);
        parentFolder = DriveApp.getRootFolder();
      }
    } else {
      parentFolder = DriveApp.getRootFolder();
    }
    
    // 2. Dapatkan atau buat folder outlet/owner di dalam parent folder (bebas duplikat berkat LockService)
    var folders = parentFolder.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = parentFolder.createFolder(folderName);
    }
    
    // 3. Simpan file Excel asli (.xlsx) ke Google Drive
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();
    var spreadsheetUrl = "";
    
    // 4. Konversi file Excel menjadi Google Spreadsheet menggunakan Drive API
    try {
      var sheetFile;
      if (typeof Drive.Files.insert === 'function') {
        // Drive API v2 (Default Apps Script Advanced Service)
        sheetFile = Drive.Files.insert({
          title: fileName.replace(/\.xlsx$/i, ''),
          mimeType: MimeType.GOOGLE_SHEETS,
          parents: [{id: folder.getId()}]
        }, blob);
        spreadsheetUrl = sheetFile.alternateLink;
      } else {
        // Drive API v3
        sheetFile = Drive.Files.create({
          name: fileName.replace(/\.xlsx$/i, ''),
          mimeType: MimeType.GOOGLE_SHEETS,
          parents: [folder.getId()]
        }, blob);
        spreadsheetUrl = sheetFile.webViewLink;
      }
      
      // Mengatur agar file spreadsheet dapat diakses/dilihat oleh siapa saja yang memiliki link
      DriveApp.getFileById(sheetFile.id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
    } catch (err) {
      // Fallback menggunakan URL excel asli jika Drive API Advanced Service belum diaktifkan
      spreadsheetUrl = fileUrl;
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileUrl: fileUrl,
      spreadsheetUrl: spreadsheetUrl
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (eRelease) {}
  }
}
