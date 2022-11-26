const user = require('./userModel');
const modelCategory = require('./categoryModel');
const mysql = require('mysql2/promise');
const logger = require('../logger');
const err = require('./exceptions/errors');

var connection;
var exception;

/**
 * Error for 400-level issues.
 */
class postItException extends Error {}

/**
 * Establishes the connection to the database and creates the postIt table
 * if it doesn't exist already.
 * @param {string} dbName Name of the database to connect to.
 * @throws User.databaseException if there are any issues.
 */
async function initialize(dbName, reset) {
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            port: '10000',
            password: 'pass',
            database: dbName
        });

        //verify if the database needs to be reset
        if (reset) {

            //drop the table if it exists
            var dropQuery = `DROP TABLE IF EXISTS post_it;`;
            await connection.execute(dropQuery);
            logger.info(`Table post_it dropped`);

            dropQuery = `DROP TABLE IF EXISTS category;`;
            await connection.execute(dropQuery);
            logger.info(`Table category dropped`);

            dropQuery = `DROP TABLE IF EXISTS user;`;
            await connection.execute(dropQuery)
            logger.info(`Table user dropped`);
        }

        //create a new table
        const sqlQuery = `CREATE TABLE IF NOT EXISTS post_it (post_id int AUTO_INCREMENT, user_id int, category_id int, title VARCHAR(50), description VARCHAR(50), pinned VARCHAR(3), day_of_week VARCHAR(11), completed VARCHAR(3), PRIMARY KEY(post_id), FOREIGN KEY(user_id) REFERENCES user(user_id), FOREIGN KEY(category_id) REFERENCES category(category_id));`;;
        //execute command
        await connection.execute(sqlQuery);
        logger.info(`Table post_it created/exists`);
        
        const addDefaultValue = `ALTER TABLE post_it ALTER completed SET DEFAULT 'F';`
        await connection.execute(addDefaultValue);
        logger.info(`Added default value to completed column.`);

    } catch (error) {

        logger.error(error.message);
        exception = new err.databaseException();
        return exception;
    }

}

/**
 * Insert a new row into the database using the input parameters.
 * @param {number} userId The ID of the user.
 * @param {number} categoryId The ID of the category.
 * @param {string} title Title of the post-it.
 * @param {string} description Description of the post-it.
 * @param {string} pinned Determines whether the post-it is pinned.
 * @param {string} weekday Day of the weekday for the post-it.
 * @returns Returns object containing the post-it's information.
 * @throws User.databaseException, postItException
 */
async function createPostIt(userId, categoryId, title, description, pinned, weekday) {

    //validate input parameters
    if (!validateTitle(title) || !validateDescription(description) || !validateWeekDay(weekday)) {
        logger.info(`Unable to add post-it, information is invalid`);
        exception = new postItException(`Unable to add post-it, information is invalid`);
        return exception;
    }

    //check if the post-it already exists in the database
    //create select query for title
    const selectTitleQuery = `SELECT * FROM post_it WHERE title='${title}';`;

    try {

        //execute select query for title
        const duplicateTitle = await connection.execute(selectTitleQuery);

        //check if the returned queries are not empty
        if (duplicateTitle[0].length != 0) {
            logger.info(`Unable to add post-it, post-it already exists`);
            exception = new postItException(`Unable to add post-it, post-it already exists`);
            return exception;
        }

        //check if user exists in the database
        const retrievedUser = await user.findById(userId);

        //check if category exists in the database
        const retrievedCategory = await modelCategory.findById(categoryId);

        //verify results
        if (retrievedUser[0].length === 0 || retrievedUser[0] === null || retrievedUser[0] === undefined) {
            logger.info(`Only users can create categories`);
            exception = new postItException(`Only users can create categories`);
            return exception;
        }

        if (retrievedCategory[0].length === 0 || retrievedCategory === null || retrievedCategory === undefined) {
            logger.info(`Post-its must belong to a category`);
            exception = new postItException(`Post-its must belong to a category`);
            return exception;
        }

        //create add query
        const addQuery = `INSERT INTO post_it (title, description, pinned, day_of_week, user_id, category_id) VALUES ('${title}','${description}','${pinned}','${weekday}', ${userId}, ${categoryId});`;

        //execute add query
        await connection.execute(addQuery);
        logger.info(`Post-it added successfully`);

        //execute select query
        const retrievedPostIt = await connection.execute(selectTitleQuery);

        //verify if the post-it was added to the database
        if (retrievedPostIt[0][0] === null || retrievedPostIt[0][0] === undefined) {
            logger.info(`Post-it was not added to database`);
            exception = new postItException(`Post-it was not added to database`);
            return exception;
        } else {
            return retrievedPostIt;
        }

    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

/**
 * Select a row from the database based on the title.
 * @param {string} title Title of the post-it.
 * @returns Returns the retrieved post-it from the database if found, otherwise returns null.
 * @throws User.databaseException, postItException
 */
async function findByTitle(title) {

    //validate title input
    if (!validateTitle(title)) {
        logger.info(`Title is not valid`);
        exception = new postItException(`Title is not valid`);
        return exception;
    }

    //create select query using title
    const selectQuery = `SELECT * FROM post_it WHERE title='${title}';`;

    try {

        //execute select query
        const retrievedPostIt = await connection.execute(selectQuery);

        //check if the post-it exists in database
        if (retrievedPostIt[0] == undefined || retrievedPostIt[0].length == 0) {
            logger.info(`Post-it does not exist in database`);
            exception = new postItException(`Post-it does not exist in database`);
            return exception;
        } else {
            logger.info(`Post-it found in database`);
            return retrievedPostIt;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

/**
 * Select a row from the database based on the post-it's id.
 * @param {number} id Id of the post-it.
 * @returns Returns the retrieved post-it from the database if found, otherwise returns null.
 * @throws User.databaseException, postItException
 */
async function findById(id) {

    // //check if id is a string
    // if (typeof id === 'string') {
    //     logger.info(`Invalid Id`);
    //     exception = new postItException(`Post-it does not exist in database`);
    //     return exception;
    // }
    //create select query using id
    const selectQuery = `SELECT * FROM post_it WHERE post_id=${id};`;

    try {

        //execute select query
        const retrievedPostIt = await connection.execute(selectQuery);

        //check if the post-it exists in database
        if (retrievedPostIt[0] == undefined || retrievedPostIt[0].length == 0) {
            logger.info(`Post-it does not exist in database`);
            exception = new postItException(`Post-it does not exist in database`);
            return exception;
        } else {
            logger.info(`Post-it found in database`);
            return retrievedPostIt[0];
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}


/**
 * Select the post-it from the database based on week day and the user id.
 * @param {string} weekday The day of the week.
 * @param {number} userId The user Id.
 * @returns Returns the retrieved post-its from the database if found, otherwise returns null.
 * @throws User.databaseException, postItException
 */
 async function findByWeekdayAndUserId(weekday, userId) {
    
    //validate the day of the week
    if (!validateWeekDay(weekday)) {
        logger.info(`Week day or User Id is not valid`);
        exception = new postItException(`Weekday or UserId is not valid`);
        return exception;
    }

    //create select query using id
    const selectQuery = `SELECT * FROM post_it WHERE day_of_week='${weekday}' AND user_id='${userId}' AND completed = 'F';`;

    try {

        //execute select query
        const retrievedPostIts = await connection.execute(selectQuery);

        //check if the post-it exists in database
        if (retrievedPostIts[0] == undefined || retrievedPostIts[0].length == 0) {
            return [];
        } else {
            logger.info(`Post-it found in database`);
            return retrievedPostIts[0];
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

/**
 * Retrieves all post-its from the database.
 * @returns All the post-its retrieved from the database.
 * @throws User.databaseException, postItException
 */
async function findAll() {

    //create select query
    const selectQuery = `SELECT * FROM post_it`;

    try {

        //execute select query
        const postItBank = await connection.execute(selectQuery);

        //check if there are any post-its retrieved from the database
        if (postItBank[0].length > 0) {
            logger.info(`Post-its found in database`);
            return postItBank;
        } else {
            logger.info(`Post-its not found in database`);
            exception = new postItException(`Post-its not found in database`);
            return exception;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}


/**
 * Retrieves all post-its from the database.
 * @returns All the post-its retrieved from the database.
 * @throws User.databaseException, postItException
 */
 async function findAllByUserId(userId) {

    //create select query
    const selectQuery = `SELECT * FROM post_it where user_id =${userId}`;

    try {

        //execute select query
        const postItBank = await connection.execute(selectQuery);

        //check if there are any post-its retrieved from the database
        if (postItBank[0].length > 0) {
            logger.info(`Post-its found in database`);
            return postItBank[0];
        } else {
            logger.info(`Post-its not found in database`);
            exception = new postItException(`Post-its not found in database`);
            return exception;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

/**
 * Retrieves all completed post-its from the database.
 * @returns All the completed post-its retrieved from the database.
 * @throws User.databaseException, postItException
 */
 async function findAllCompletedPostIt(userId) {

    //create select query
    const selectQuery = `SELECT * FROM post_it where user_id =${userId} AND completed='T'`;

    try {

        //execute select query
        const postItBank = await connection.execute(selectQuery);

        //check if there are any post-its retrieved from the database
        if (postItBank[0].length > 0) {
            logger.info(`Post-its found in database`);
            return postItBank[0];
        } else {
            logger.info(`Post-its not found in database`);
            exception = new postItException(`Post-its not found in database`);
            return exception;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}


/**
 * Update the row in the database matching a given title parameter with the given the new description.
 * @param {string} title Title of the post-it to update.
 * @param {string} newDescription New description of the post-it to update.
 * @returns Returns updated post-it object if successful, otherwise return null.
 * @throws User.databaseException, postItException
 */
async function updatePostIt(title, newDescription, weekday, category, pinned) {

    //validate new description
    if (!validateDescription(newDescription)) {
        logger.info(`Post-it update failed, new information is invalid`);
        exception = new postItException(`Post-it update failed, new information is invalid`);
        return exception;
    }

    //create select query
    const selectQuery = `SELECT * FROM post_it WHERE title='${title}';`;

    try {

        //execute select query
        const retrievedPostIt = await connection.execute(selectQuery);

        // //find the index of the post-it to update
        // const indexOfPostIt = retrievedPostIt[0].find((description => description != newDescription));

        //check if the post-it exists in the database
        if (retrievedPostIt === undefined) {
            logger.info(`Post-it update failed, unable to find post-it`);
            exception = new postItException(`Post-it update failed, unable to find post-it`);
            return exception;
        } else {
            if (connection) {
                //create update query
                
                const categoryObj = await modelCategory.findByTitle(category);
                const categoryId = categoryObj[0][0].category_id;
                const updateQuery = `UPDATE post_it 
                SET description='${newDescription}',
                day_of_week='${weekday}',
                category_id='${categoryId}',
                pinned='${pinned}'
                WHERE title='${title}';`;
                //execute update query
                const result = await connection.execute(updateQuery);

                const selectQueryUpdatedPostIt = `SELECT * FROM post_it WHERE post_id='${retrievedPostIt[0][0].post_id}';`;

                const retrievedUpdatedPostIt = await connection.execute(selectQueryUpdatedPostIt);

                if (result[0].affectedRows > 0) {
                    logger.info(`Post-its updated in database`);
                    return retrievedUpdatedPostIt[0][0];
                } else {
                    logger.info(`Post-its not updated in database`);
                    exception = new postItException(`Post-its not found in database`);
                    return exception;
                }
            }
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

/**
 * Delete the corresponding row from the database matching the given title.
 * @param {string} title Title of the post-it to delete.
 * @returns Return true if the post-it was removed successfully, otherwise return false.
 * @throws User.DatabaseException, postItException
 */
async function deletePostIt(title) {

    //validate title input
    if (!validateTitle(title)) {
        logger.info(`Post-it delete failed,information is invalid.`);
        exception = new postItException(`Post-it delete failed,information is invalid.`);
        return exception;
    }

    //create delete query
    const deleteQuery = `DELETE FROM post_it WHERE title= '${title}';`;

    try {

        //execute delete query
        await connection.execute(deleteQuery);

        //create select query
        const selectQuery = `SELECT * FROM post_it WHERE title='${title}';`;

        //execute select query
        var row = await connection.execute(selectQuery);

        //check if the post-it exists in the database
        if (row[0].length === 0) {
            logger.info(`Post-it deleted successfully`);
            return true;
        } else {
            logger.info(`Post-it was NOT deleted successfully`);
            return false;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}


/**
 * Delete the corresponding row from the database matching the given title.
 * @param {string} title Title of the post-it to delete.
 * @returns Return true if the post-it was removed successfully, otherwise return false.
 * @throws User.DatabaseException, postItException
 */
 async function deletePostItById(postItId) {


    //create delete query
    const deleteQuery = `DELETE FROM post_it WHERE post_id = '${postItId}';`;

    try {

        //execute delete query
        await connection.execute(deleteQuery);

        //create select query
        const selectQuery = `SELECT * FROM post_it WHERE title='${postItId}';`;

        //execute select query
        var row = await connection.execute(selectQuery);

        //check if the post-it exists in the database
        if (row[0].length === 0) {
            logger.info(`Post-it deleted successfully`);
            return true;
        } else {
            logger.info(`Post-it was NOT deleted successfully`);
            return false;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

async function setPostItAsCompleted(postItId) {

    //create select query
    const selectQuery = `SELECT * FROM post_it WHERE post_id='${postItId}';`;

    try {

        //execute select query
        const retrievedPostIt = await connection.execute(selectQuery);

        //check if the post-it exists in the database
        if (retrievedPostIt === undefined) {
            logger.info(`Post-it update failed, unable to find post-it`);
            exception = new postItException(`Post-it update failed, unable to find post-it`);
            return exception;
        } else {
            if (connection) {
                //create update query
                const updateQuery = `UPDATE post_it SET completed='T' WHERE post_id='${postItId}';`;

                //execute update query
                await connection.execute(updateQuery);

                //log success to console
                logger.info(`Post It was updated successfully to completed`);

                //execute select query for updated post-it
                const updatedPostIt = await connection.execute(selectQuery);

                //return the retrieved updated post-it
                return updatedPostIt;
            }
        }
    } catch (error) {

        logger.error(error.message);
        exception = new user.databaseException();
        return exception;
    }
}

// /**
//  * Checks if the given input value is T(for pinned) or F(not pinned).
//  * @param {string} pinned Checks if the post is pinned or not.
//  * @returns Returns true if the value is T, otherwise return false.
//  */
// function validatePinned(pinned) {
//     if (pinned.toUpperCase() === 'T' || pinned.toUpperCase() === 'F') {
//         return true;
//     } else {
//         return false;
//     }
// }

/**
 * Checks if the given input value is a non empty string.
 * @param {string} description Description of the post-it.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validateDescription(description) {
    if (typeof description === 'string') {
        if (description === ' ') {
            return false;
        } else {
            return true;
        }
    }
}

/**
 * Checks if the given input value is a non empty string.
 * @param {string} title Title of the post-it.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validateTitle(title) {
    if (typeof title === 'string') {
        if (title === ' ') {
            return false;
        } else {
            return true;
        }
    }
}


function validateWeekDay(weekday) {
    const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    if(typeof weekday === 'string') {
        return weekdays.includes(weekday);
    }
}

/**
 * Returns connection information.
 * @returns Returns connection information.
 */
function getConnection() {
    return connection;
}

module.exports = {
    initialize,
    createPostIt,
    findByTitle,
    findById,
    findAll,
    findAllCompletedPostIt,
    findAllByUserId,
    findByWeekdayAndUserId,
    updatePostIt,
    setPostItAsCompleted,
    deletePostIt,
    deletePostItById,
    getConnection,
    postItException
}