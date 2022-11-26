const express = require('express');
const router = express.Router();
const routeRoot = '/';

/**
 * Renders the error error message and status code.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
function handleError(request, response) {
    response.render('errorPage.hbs', { message: 'Invalid URL entered.  Please try again.', status: 404 });
}

//router methods
router.all('*', handleError)

module.exports = {
    router,
    routeRoot,
    handleError
}