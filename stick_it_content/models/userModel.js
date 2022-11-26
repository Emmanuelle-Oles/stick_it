const mysql = require('mysql2/promise');
const logger = require('../logger');
const exceptions = require('../models/exceptions/errors');
var connection;
var exception;

/**
 * Establishes the connection to the database and creates the user table
 * if it doesn't exist already.
 * @param {string} dbName Name of the database to connect to.
 * @param {boolean} reset Verifies if the database needs to be reset before initializing.
 * @throws databaseException if there is any issues.
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

            //drop the linked tables and user table
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
        const sqlQuery = `CREATE TABLE IF NOT EXISTS user (user_id int AUTO_INCREMENT, username VARCHAR(30), email VARCHAR(50), password VARCHAR(50), icon VARCHAR(400), PRIMARY KEY(user_id))`;

        //execute command
        await connection.execute(sqlQuery);
        logger.info(`Table user created/exists`);

    } catch (error) {
        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Validates user input and verifies if the user exists in the database.
 * @param {string} email Email of the user to be logged in.
 * @param {string} password Password of the user to be logged in. 
 * @returns Returns logged in user. 
 */
async function login(email, password) {
    //check if the email is missing
    if (!validateEmail(email)) {
        logger.error(`Cannot log in: Missing email.`);
        exception = new exceptions.authException(`Cannot log in: Missing email.`);
        return exception;
    }

    //check if the password is missing
    if (!validatePassword(password)) {
        logger.error(`Cannot log in: Missing password.`);
        exception = new exceptions.authException(`Cannot log in: Missing password.`);
        return exception;
    }

    //create select query
    const selectQuery = `SELECT * FROM user WHERE email = '${email}' AND password = '${password}';`;

    try {
        //execute command
        const results = await connection.execute(selectQuery);

        //log info
        logger.info('User logged in');

        //check if the user exists
        if (results[0]) {
            return results[0][0];
        } else {
            logger.error(`Invalid credentials: Unable to log in user.`);
            exception = new exceptions.userException(`Invalid credentials: Unable to log in user.`);
            return exception;
        }

    } catch (error) {
        logger.error(error);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Insert a new row into the database using the input parameters.
 * @param {string} username Username of the user.
 * @param {string} email Email of the user.
 * @param {string} password Password of the user.
 * @returns Returns object containing user's information.
 * @throws databaseException, userException
 */
async function createUser(username, email, password, icon) {

    //validate input parameters
    if (!validateUsername(username) || !validateEmail(email) || !validatePassword(password)) {
        logger.info(`Unable to add user, information is invalid`);
        exception = new exceptions.userException(`Unable to add user, information is invalid`);
        return exception;
    }

    icon = 'https://icon-library.com/images/default-user-icon/default-user-icon-8.jpg';

    //check if the user already exists in the database

    const duplicateUsername = await findByUsername(username);
    const duplicateEmail = await findByEmail(email);

    if (!(duplicateUsername instanceof exceptions.userException || duplicateUsername instanceof exceptions.databaseException) || !(duplicateEmail instanceof exceptions.userException || duplicateEmail instanceof exceptions.databaseException)) {
        logger.info(`Unable to add user, user already exists`);
        exception = new exceptions.userException(`Unable to add user, user already exists`);
        return exception;
    }

    //create select query
    const selectUsernameQuery = `SELECT * FROM user WHERE username='${username}';`;

    //create add query
    const addQuery = `INSERT INTO user (username, email, password, icon) VALUES ('${username}','${email}','${password}', '${icon}');`;

    try {
        //execute add query
        await connection.execute(addQuery)
        logger.info(`User added successfully`);

        //execute select query
        const retrievedUser = await connection.execute(selectUsernameQuery);

        //verify if the user was added to the database
        if (retrievedUser[0][0] === null || retrievedUser[0][0] === undefined) {
            logger.info(`User was not added to database`);
            exception = new exceptions.userException(`User was not added to database`);
            return exception;

        } else {
            return retrievedUser;
        }
    } catch (error) {
        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Select a row from the database based on the email.
 * @param {string} email Email of the user.
 * @returns Returns the retrieved user from the database if found, otherwise returns null.
 * @throws databaseException, userException
 */
async function findByEmail(email) {

    //validate email input
    if (!validateEmail(email)) {
        logger.info(`Email is not valid`);
        exception = new exceptions.userException(`Email is not valid`);
        return exception;
    }

    //create select query using email
    const selectQuery = `SELECT * FROM user WHERE email='${email}';`;

    try {
        //execute select query
        const retrievedUser = await connection.execute(selectQuery);

        //check if the user exists in database
        if (retrievedUser[0] == undefined || retrievedUser[0].length == 0) {
            logger.info(`User does not exist in database`);
            exception = new exceptions.userException(`User does not exist in database`);
            return exception;

        } else {
            //return retrievedUser
            logger.info(`User found in database`);
            return retrievedUser;
        }

    } catch (error) {
        logger.error(error.message);
        exception = new exceptions.databaseException();
        return exception;
    }
}

/**
 * Select a row from the database based on the username.
 * @param {string} username Username of the user.
 * @returns Returns the retrieved user from the database if found, otherwise returns null.
 * @throws databaseException, userException
 */
async function findByUsername(username) {

    //validate username input
    if (!validateUsername(username)) {
        logger.info(`Username is not valid`);
        exception = new exceptions.userException(`Username is not valid`);
        return exception;
    }

    //create select query using username
    const selectQuery = `SELECT * FROM user WHERE username='${username}';`;

    try {
        //execute select query
        const retrievedUser = await connection.execute(selectQuery);

        //check if the user exists in database
        if (retrievedUser[0][0] == undefined || retrievedUser[0][0].length == 0) {

            logger.info(`User does not exist in database`);
            throw new exceptions.userException(`User does not exist in database`);

        } else {
            //return retrievedUser
            logger.info(`User found in database`);
            return retrievedUser[0][0];
        }
    } catch (error) {

        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Select a row from the database based on the user's id.
 * @param {number} id Id of the user.
 * @returns Returns the retrieved user from the database if found, otherwise returns null.
 * @throws databaseException, userException
 */
async function findById(id) {
    //check if id is a string
    if (typeof parseInt(id) === 'string') {

        logger.info(`Invalid Id`);
        exception = new exceptions.userException(`User does not exist in database`);
        return exception;
    }

    //create select query using id
    const selectQuery = `SELECT * FROM user WHERE user_id= ${id};`;

    try {
        //execute select query
        const retrievedUser = await connection.execute(selectQuery);

        //check if the user exists in database
        if (retrievedUser[0] == undefined || retrievedUser[0].length == 0) {

            logger.info(`User does not exist in database`);
            exception = new exceptions.userException(`User does not exist in database`);
            return exception;
        } else {
            //return retrievedUser
            logger.info(`User found in database`);
            return retrievedUser;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Retrieves all users from the database.
 * @returns All the users retrieved from the database.
 * @throws databaseException, userException
 */
async function findAll() {
    //create select query
    const selectQuery = `SELECT * FROM user`;

    try {

        //execute select query
        const userBank = await connection.execute(selectQuery);

        //check if there are any users retrieved from the database
        if (userBank[0].length > 0) {
            logger.info(`Users found in database`);
            return userBank;
        } else {
            logger.info(`Users not found in database`);
            exception = new exceptions.userException(`Users not found in database`);
            return exception;
        }
    } catch (error) {
        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Update the row in the database matching a given email parameter with the given the new username and password.
 * @param {string} userEmail Email of the user to update.
 * @param {string} newUsername New username of the user to update.
 * @param {string} newPassword New password of the user to update.
 * @returns Returns updated user object if successful, otherwise return null.
 * @throws databaseException, userException
 */
async function updateUser(userEmail, newUsername, newPassword, newIcon) {

    //validate new username and new password input
    if (!validateUsername(newUsername) || !validatePassword(newPassword)) {
        logger.info(`User update failed, new information is invalid`);
        exception = new exceptions.userException(`User update failed, new information is invalid`);
        return exception;
    }

    if (!validateIcon(newIcon)) {
        newIcon = 'images/default.jpg';
    }

    //create select query
    const selectQuery = `SELECT * FROM user WHERE email='${userEmail}';`;

    //create update query
    const updateQuery = `UPDATE user SET username='${newUsername}', password='${newPassword}', icon='${newIcon}' WHERE email='${userEmail}';`;

    try {
        //execute select query
        const retrievedUser = await connection.execute(selectQuery);

        //find the index of the user to update
        const indexOfUser = retrievedUser[0].find((username => username != newUsername));

        //check if the user exists in the database
        if (indexOfUser === undefined) {
            logger.info(`User update failed, unable to find user`);
            exception = new exceptions.userException(`User update failed, unable to find user`);
            return exception;
        } else {

            //execute update query
            await connection.execute(updateQuery);
            logger.info(`Username and password was updated successfully`);

            //execute select query for updated user
            const updatedUser = await connection.execute(selectQuery);

            //return the retrieved updated user
            return updatedUser;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Delete the corresponding row from the database matching the given email.
 * @param {string} email Email of the user to delete.
 * @returns Return true if the user was removed successfully, otherwise return false.
 * @throws databaseException, userException
 */
async function deleteUser(email) {

    //validate email input
    if (!validateEmail(email)) {
        logger.info(`User delete failed,information is invalid.`);
        exception = new exceptions.userException(`User delete failed,information is invalid.`);
        return exception;
    }

    //create delete query
    const deleteQuery = `DELETE FROM user WHERE email= '${email}';`;

    //create select query
    const selectQuery = `SELECT * FROM user WHERE email= '${email}';`;

    try {

        //execute delete query
        await connection.execute(deleteQuery);

        //execute select query
        var row = await connection.execute(selectQuery);

        //check if the user exists in the database
        if (row[0].length === 0) {
            logger.info(`User deleted successfully`);
            return true;
        } else {
            logger.info(`User NOT deleted successfully`);
            return false;
        }
    } catch (error) {

        logger.error(error.message);
        exception = new exceptions.databaseException(error.message);
        return exception;
    }
}

/**
 * Checks if the given input value is a non empty string.
 * @param {string} password Password of the user.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validatePassword(password) {
    if (typeof password === 'string') {
        if (password === ' ') {
            return false;
        } else {
            return true;
        }
    }
}

/**
 * Checks if the given input value is a non empty string.
 * @param {string} email Email of the user.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validateEmail(email) {
    if (typeof email === 'string') {
        if (email === ' ') {
            return false;
        } else {
            return true;
        }
    }
}

/**
 * Checks if the given input value is a non empty string.
 * @param {string} username Username of the user.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validateUsername(username) {
    if (typeof username === 'string') {
        if (username === ' ') {
            return false;
        } else {
            return true;
        }
    }
}

/**
 * Checks if the given input value is a non empty string.
 * @param {string} icon Icon of the user.
 * @returns Returns true if the value is a non empty string, otherwise return false.
 */
function validateIcon(icon) {
    if (typeof icon === 'string') {
        if (icon === ' ') {
            return false;
        } else {
            return true;
        }
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
    login,
    createUser,
    findByEmail,
    findByUsername,
    findById,
    findAll,
    updateUser,
    deleteUser,
    getConnection
}