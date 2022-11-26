const mysql = require("mysql2/promise");
const logger = require("../logger");
const category = require("./categoryModel");
const err = require('./exceptions/errors');

var connection;
var exception;

//Objects containing color and their code. Should have 15 values (will add more later).
const colors = [
    { color: "Red", code: "FE0000" },
    { color: "Orange", code: "EF8906" },
    { color: "Yellow", code: "FFD100" },
    { color: "Green", code: "A9E59E" },
    { color: "Blue", code: "94CAEE" },
    { color: "Purple", code: "D39AFF" },
    { color: "Pink", code: "ECC8FC" },
    { color: "White", code: "FFFFFF" },
];



/**
 * TODO: icon, logout, cookies, sessions...
 */

/**
 *
 * @param {string} dbname Name of the database to connect to
 * @param {boolean} reset Connects normally if set to false. If set to true the database will be reset.
 * @returns
 */
async function initialize(dbname, reset) {
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            port: "10000",
            password: "pass",
            database: dbname,
        });

        if (reset) {
            let dropQuery = `DROP TABLE IF EXISTS post_it;`;
            await connection.execute(dropQuery);
            logger.info(`Table post_it dropped.`);

            dropQuery = `DROP TABLE IF EXISTS color;`;
            await connection.execute(dropQuery);
            logger.info(`Table color dropped.`);

            dropQuery = `DROP TABLE IF EXISTS category;`;
            await connection.execute(dropQuery);
            logger.info(`Table category dropped.`);

            dropQuery = `DROP TABLE IF EXISTS user;`;
            await connection.execute(dropQuery);
            logger.info(`Table user dropped.`);
        }
        //Create color table and fill it with default values
        //await resetColorTable();
        await setColorTableToDefault(true);
    } catch (error) {
        logger.error(error.message);
        exception = new err.databaseException();
        return exception;
    }
}
//resets the table by dropping it and creating it and then filling it
async function setColorTableToDefault(reset) {
    //Reset Table

    try {
        if(reset){
            await resetColorTable();
        
        

        colors.forEach(async(color) => {
            const sqlQuery = `INSERT INTO color (color_name, color_code) VALUES ('${color.color}', '${color.code}');`;
            await connection.execute(sqlQuery);
            logger.info(`'${colors.color}' added to color table.`);
        });
    }
    } catch (error) {
        logger.error(error.message);
        throw new err.databaseException(
            "Error connecting to database. Check Database connection."
        );
    }
}

async function resetColorTable() {
    try {
        const dropQuery = `DROP TABLE IF EXISTS color;`;
        await connection.execute(dropQuery);
        logger.info(`Table color dropped.`);

        const sqlQuery = `CREATE TABLE IF NOT EXISTS color (color_id int AUTO_INCREMENT, color_name VARCHAR(20), category_id int, color_code VARCHAR(8), PRIMARY KEY(color_id), FOREIGN KEY(category_id) REFERENCES category(category_id));`;
        await connection.execute(sqlQuery);
    } catch (error) {
        logger.error(error.message);
        throw new err.databaseException(
            "Error resetting database. Check database connection."
        );
    }
}


//Runs query to get color names that have NULL assigned to category_id
async function getAvailableColorNames() {
    const sqlQuery = `SELECT * from color WHERE category_id IS NULL;`;

    try {
        const allColors = await connection.execute(sqlQuery);

        if (allColors == undefined || allColors[0].length == 0) {
            logger.info("Colors do not exist in the database.");
            throw new err.colorException();
        } else {
            logger.info("Colors exist in database.");
            return allColors;
        }
    } catch (error) {
        logger.error(error.message);
        throw new err.databaseException();
    }
}

//Should names be retrieved from constant or from db
async function getAllColorNames() {
    //Query
    const selectQuery = `SELECT * FROM color;`;
    try {
        const tableResults = await connection.execute(selectQuery);
        if (tableResults[0].length > 0) {
            logger.info(`Colors found in database`);
            return tableResults[0];
        } else {
            logger.info(`Colors not found in database`);
            throw new colorException("Default colors not present in databse.");
        }
    } catch (error) {
        logger.error(error.message);
    }
}

//Retrieves color assigned to a certain category_id
async function getColorByAssignedCategory(id) {
    //id is the category id

    const sqlQuery = `SELECT * from color WHERE category_id = '${id}';`;
    try {
        const retrievedColor = await connection.execute(sqlQuery);
        if (retrievedColor[0] == undefined) {
            logger.info(`Color not assigned to category`);
            throw new err.colorException("Category not assigned to any color.");
        }
    } catch (error) {
        logger.error(error.message);
        throw new err.databaseException();
    }
}
//Assigns category_id to a color
async function assignCategoryToColor(categoryId, colorCode) {
    const sqlQuery = `UPDATE color SET category_id = '${categoryId}' WHERE color_code = '${colorCode}';`;

    try {
        await connection.execute(sqlQuery);
        logger.info("Color updated successfully.");

        const getUpdatedColor = `SELECT * FROM color WHERE color_code = '${colorCode}' AND category_id = '${categoryId}';`;
        const color = await connection.execute(getUpdatedColor);
        return color;
    } catch (error) {
        logger.error(error.message);
        exception = new err.databaseException();
        return exception;
    }
}
//Send in a category id to remove it from the color table
async function removeCategoryFromColor(categoryId) {
    const sqlQuery = `UPDATE color SET category_id = NULL WHERE category_id = '${categoryId}';`;

    try {
        await connection.execute(sqlQuery);
        logger.info("Category removed from color table");

    } catch (error) {
        logger.error(error.message);
        exception = new err.databaseException();
        return exception;
    }
}

module.exports = {
    initialize,
    getAvailableColorNames,
    getAllColorNames,
    getColorByAssignedCategory,
    assignCategoryToColor,
    removeCategoryFromColor,
};