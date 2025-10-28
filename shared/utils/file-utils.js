const fs = require('fs').promises;
const path = require('path');

class FileUtils {
    static async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                name: path.basename(filePath),
                path: filePath,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                permissions: stats.mode.toString(8),
                isReadable: true,
                isWritable: true
            };
        } catch (error) {
            throw new Error(`无法获取文件信息: ${error.message}`);
        }
    }

    static async listDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            const fileList = [];

            for (const file of files) {
                const fullPath = path.join(dirPath, file.name);
                const info = await this.getFileInfo(fullPath);
                fileList.push(info);
            }

            return fileList.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            throw new Error(`无法列出目录内容: ${error.message}`);
        }
    }

    static async createFile(filePath, content = '') {
        try {
            await fs.writeFile(filePath, content, 'utf8');
            return true;
        } catch (error) {
            throw new Error(`无法创建文件: ${error.message}`);
        }
    }

    static async createDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            throw new Error(`无法创建目录: ${error.message}`);
        }
    }

    static async deleteFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                await fs.rmdir(filePath, { recursive: true });
            } else {
                await fs.unlink(filePath);
            }
            return true;
        } catch (error) {
            throw new Error(`无法删除文件: ${error.message}`);
        }
    }

    static async moveFile(sourcePath, targetPath) {
        try {
            await fs.rename(sourcePath, targetPath);
            return true;
        } catch (error) {
            throw new Error(`无法移动文件: ${error.message}`);
        }
    }

    static async copyFile(sourcePath, targetPath) {
        try {
            await fs.copyFile(sourcePath, targetPath);
            return true;
        } catch (error) {
            throw new Error(`无法复制文件: ${error.message}`);
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }

    static isImageFile(filename) {
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
        return imageExts.includes(this.getFileExtension(filename));
    }

    static isTextFile(filename) {
        const textExts = ['.txt', '.md', '.rtf', '.log', '.json', '.xml', '.yaml', '.yml'];
        return textExts.includes(this.getFileExtension(filename));
    }

    static isCodeFile(filename) {
        const codeExts = ['.js', '.html', '.css', '.php', '.py', '.java', '.cpp', '.c', '.h', '.rb', '.go', '.rs'];
        return codeExts.includes(this.getFileExtension(filename));
    }

    static validatePath(filePath, basePath) {
        const resolvedPath = path.resolve(filePath);
        const resolvedBase = path.resolve(basePath);
        return resolvedPath.startsWith(resolvedBase);
    }
}

module.exports = FileUtils;
