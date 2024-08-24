const fs = require('fs').promises;
const path = require('path');

class SQLManager {
    constructor() {
        this.cache = new Map();
        this.sqlDir = path.join(__dirname, 'sql');
    }

    async getSQL(scriptName) {
        if (this.cache.has(scriptName)) {
            return this.cache.get(scriptName);
        }

        const filePath = path.join(this.sqlDir, `${scriptName}.sql`);
        try {
            const sql = await fs.readFile(filePath, 'utf-8');
            this.cache.set(scriptName, sql);
            return sql;
        } catch (error) {
            console.error(`Ошибка при чтении SQL файла: ${error}`);
            throw error;
        }
    }
}

module.exports = new SQLManager();