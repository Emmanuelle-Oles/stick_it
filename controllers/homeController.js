const express = require('express');
const { render } = require('express/lib/response');
const router = express.Router();
const routeRoot = '/';

//Models
const postItModel = require('../models/postItModel');
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');
const { route } = require('express/lib/router');
const res = require('express/lib/response');

/**
 * Renders the home page.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
function showHome(request, response) {
    const pageData = {
        displayUserNavBar: true,
        displayHomePage: true,
        displayLoggedInUser: false,
        userNavBarContent: [
            { title: 'Login', path: '/login' },
            { title: 'Sign Up', path: '/register' }
        ],
        navBarContent: [{ id: 'about-us', title: 'About us', path: '.' }]
    };
    response.render('homePage.hbs', pageData);
}

//router methods
router.get('/', showHome);
router.get('/home', showHome);

module.exports = {
    router,
    routeRoot,
    showHome,
}