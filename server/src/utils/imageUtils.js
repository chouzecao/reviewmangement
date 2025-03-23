const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');

/**
 * 生成指定比例的缩略图
 * @param {string} originalPath - 原图文件路径
 * @param {number} scale - 缩放比例 (0-1)
 * @param {string} suffix - 缩略图文件名后缀
 * @returns {Promise<string>} - 返回生成的缩略图路径
 */
async function generateThumbnail(originalPath, scale, suffix) {
  try {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const thumbnailPath = path.join(dir, `${basename.replace('_original', '')}_thumbnail_${suffix}${ext}`);
    
    // 获取原图信息
    const metadata = await sharp(originalPath).metadata();
    
    // 计算缩略图尺寸（保持宽高比）
    const width = Math.round(metadata.width * scale);
    
    // 生成缩略图
    await sharp(originalPath)
      .resize({ width })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    throw error;
  }
}

/**
 * 删除图片及其缩略图
 * @param {Object} screenshot - 截图对象，包含各种路径
 * @returns {Promise<boolean>} - 返回是否成功删除
 */
async function deleteImages(screenshot) {
  try {
    const pathsToDelete = [
      screenshot.originalPath, 
      screenshot.thumbnail80Path,
      screenshot.thumbnail50Path
    ].filter(Boolean);
    
    for (const filePath of pathsToDelete) {
      if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath);
      }
    }
    return true;
  } catch (error) {
    console.error('删除图片失败:', error);
    return false;
  }
}

/**
 * 处理上传的图片，生成缩略图并返回相关信息
 * @param {Object} file - Multer 上传的文件对象
 * @returns {Promise<Object>} - 返回图片信息对象
 */
async function processUploadedImage(file) {
  const originalPath = file.path;
  
  // 生成 80% 和 50% 的缩略图
  const thumbnail80Path = await generateThumbnail(originalPath, 0.8, '80');
  const thumbnail50Path = await generateThumbnail(originalPath, 0.5, '50');
  
  return {
    originalPath,
    thumbnail80Path,
    thumbnail50Path,
    fileSize: file.size,
    fileType: file.mimetype,
    uploadTime: new Date(),
    isDeleted: false
  };
}

module.exports = {
  generateThumbnail,
  deleteImages,
  processUploadedImage
}; 