const { response } = require('express');
const express = require('express');
const exceptions = require('../models/exceptions/errors');
const router = express.Router();
const routeRoot = '/';

//Model
const userModel = require('../models/userModel');

/**
 * Renders the error page with the given error message.
 * @param {string} message The failure message for the CRUD operations.
 * @param {number} status The status code for the failed operation.
 * @param {*} response Tracks status of the controller.
 */
function showUserError(message, status, response) {
    response.render('errorPage.hbs', { message: message, status: status });
}

function showUserProfile(pageData, response) {
    response.render('userProfilePage.hbs', { pageData: pageData });
}

/**
 * Creates a new user via the model.
 * @param {*} response Tracks the status of the controller.
 */
async function newUser(username, email, password, icon, response) {

    try {
        //create user
        const user = await userModel.createUser(username, email, password, icon);

        //check if insertion was successful
        if (user instanceof exceptions.userException) {
            showUserError('User NOT created!', 400, response);
        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showUserError('Database error! Unable to add User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showUserError('User NOT created!', 400, response);
        } else {
            showUserError('Unexpected error trying to add user.', 500, response);
        }
    }
}

/**
 * Shows a specified user using their username.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function showUser(request, response) {
    try {
        //retrieve user 
        const user = await userModel.findByUsername(request.params.username);

        //check if the search was successful
        if (user instanceof exceptions.userException) {
            showUserError('User NOT found!', 400, response);
        }

        const pageData = {
            userNavBarContent: [
                { title: 'Update', path: '/user/update' },
                { title: 'Delete Account', path: `/user/delete/${user.email}` },
                { title: 'Logout', path: '/logout' }
            ],
            username: user.username,
            email: user.email,
            icon: user.icon
        };

        showUserProfile(pageData, response);

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showUserError('Database error! Unable to find User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showUserError('User NOT found!', 400, response);
        } else {
            showUserError('Unexpected error trying to find user.', 500, response);
        }
    }
}

/**
 * Retrieve all users from the database.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function showAllUsers(request, response) {
    try {
        //retrieve all users
        const user = await userModel.findAll();

        //check if the search was successful
        if (user instanceof exceptions.userException) {
            showUserError('Users NOT found!', 400, response);
        }
    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showUserError('Database error! Unable to find Users', 500, response);
        } else if (error instanceof exceptions.userException) {
            showUserError('Users NOT found!', 400, response);
        } else {
            showUserError('Unexpected error trying to find users.', 500, response);
        }
    }
}

/**
 * Update a user in the database.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function updateUser(request, response) {
    try {
        //update user
        const user = await userModel.updateUser(request.body.email, request.body.username, request.body.password);

        //check if the update was successful
        if (user instanceof exceptions.userException) {
            showUserError('User NOT updated!', 400, response);

        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showUserError('Database error! Unable to update User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showUserError('User NOT updated!', 400, response);
        } else {
            showUserError('Unexpected error trying to update user.', 500, response);
        }
    }
}

/**
 * Deletes a user from the database.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function destroyUser(request, response) {
    try {
        //delete user
        const user = await userModel.deleteUser(request.params.email);

        //check if the delete was successful
        if (user instanceof exceptions.userException) {
            showUserError('User NOT deleted!', 400, response);
        }

        //add div message
        response.redirect('/home');
    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showUserError('Database error! Unable to delete User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showUserError('User NOT deleted!', 400, response);
        } else {
            showUserError('Unexpected error trying to delete user.', 500, response);
        }
    }
}

//router HTTP methods
router.post('/user', newUser);
router.get('/user/delete/:email', destroyUser);
router.get('/user/:username', showUser);
router.get('/users', showAllUsers);
router.post('/user/update', updateUser);

module.exports = {
    router,
    routeRoot,
    newUser,
    showUser,
    showAllUsers,
    updateUser,
    destroyUser,
    showUserError,
    showUserProfile
}