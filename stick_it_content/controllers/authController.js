//Required Modules
const { response } = require('express');
const express = require('express');
const exceptions = require('../models/exceptions/errors');
const uuid = require('uuid');
const router = express.Router();
const { route } = require('express/lib/router');
const res = require('express/lib/response');

//Models
const postItModel = require('../models/postItModel');
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');

//Controller
const userController = require('../controllers/userController');

//Global Fields
const routeRoot = '/';
const sessions = {}
var loggedInUsername;
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const LOGGED_IN_NAV_BAR = [
    { id: 'manage-post-it', title: 'Manage Post-its', path: '/' },
    { id: 'add-post-it', title: 'Add Post-it', path: '/postit' },
    // { id: 'update-post-it', title: 'Update Post-it', path: '/updatepostit' },
    // { id: 'remove-post-it', title: 'Add Post-it', path: '/removepostit' },
    // { id: 'find-post-it', title: 'Find Post-it', path: '/postit' },
    { id: 'read-all-post-it', title: 'Retrieve All Post-its', path: '/postits' },
    { id: 'read-completed-post-it', title: 'Completed Post-its', path: '/complete' },
    { id: 'manage-categories', title: 'Manage Categories', path: '/' },
    { id: 'add-categories', title: 'Add Category', path: '/category' }
];

/**
 * Renders the login page with the appropriate form.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
function loginForm(request, response) {
    response.render('loginPage.hbs');
}

/**
 * Renders the register page with the appropriate form.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
function registerForm(request, response) {
    response.render('registerPage.hbs');
}

/**
 * Renders the error page with the given error message.
 * @param {string} message The failure message for the CRUD operations.
 * @param {number} status The status code for the failed operation.
 * @param {*} response Tracks status of the controller.
 */
function showAuthenticationError(message, status, response) {
    response.render('errorPage.hbs', { message: message, status: status });
}

/**
 * Session object contains the username of the user and the time of expiry for the session.
 * The object additionally stored protected session information.
 */
class Session {
    constructor(username, expiresAt) {
            this.username = username
            this.expiresAt = expiresAt
        }
        //determines if sessions is expired
    isExpired() {
        this.expiresAt < (new Date())
    }
}

/**
 * Creates the session information using the provided username. 
 * @param {string} username The username of the user.
 * @returns The session ID for the given logged in user.
 */
function createSession(username) {
    //generate a random UUID for the sessionId
    const sessionId = uuid.v4()

    //expires after a long period of time
    const expiresAt = new Date(2147483647 * 1000).toUTCString();

    //create a session object containing information about the user and expiry time
    const thisSession = new Session(username, expiresAt);

    //add the session information to the sessions map, using sessionId as the key
    sessions[sessionId] = thisSession;
    return sessionId;
}

/**
 * Authenticates user through the current existing cookies.
 * @param {*} request Input parameters given by the user.
 * @returns The successfully validated sessionId and userSession, otherwise returns null.
 */
function authenticateUser(request) {

    //check if the request contains authenticated cookies
    if (!request.cookies) {
        return null;
    }

    //retrieving the session token from the requests cookies
    const sessionId = request.cookies['sessionId']

    //verify if it has been set
    if (!sessionId) {
        return null;
    }

    // get the session of the user from the session map
    const userSession = sessions[sessionId]
    if (!userSession) {
        return null;
    }

    //check if the sessions is expired
    if (userSession.isExpired()) {
        delete sessions[sessionId];
        return null;
    }

    //return successfully validated session
    return { sessionId, userSession };
}

/**
 * Validates user's credentials using the model and renders the logged in page if successful.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
async function login(request, response) {
    //user credentials
    const email = request.body.email;
    const password = request.body.password;

    try {
        //validate user via the model
        const user = await userModel.login(email, password);

        //check if the retrieval was successful
        if (user instanceof exceptions.authException || user instanceof exceptions.userException) {
            showAuthenticationError('Cannot log in: Invalid credentials.', 400, response);
        }

        //keep track of the username
        loggedInUsername = user.username;
        userId = user.user_id;

        //create session
        const sessionId = createSession(loggedInUsername);

        //set cookie
        response.cookie("sessionId", sessionId);


        //generate data for the logged in page
        // var postIt = await buildDashboard(weekday[6], userId);

        const pageData = {
            displayUserNavBar: true,
            displayHomePage: false,
            displayLoggedInUser: true,
            userNavBarContent: [
                { title: 'Logout', path: '/logout' },
                { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
            ],
            navBarContent: LOGGED_IN_NAV_BAR,
            currentDayDisplayed: getDayOfWeek(),
            postItForDay: await buildDashboard(getDayOfWeek(), userId),
            displaySunday: setDashboardToCurrentDay(weekday[0]),
            displayMonday: setDashboardToCurrentDay(weekday[1]),
            displayTuesday: setDashboardToCurrentDay(weekday[2]),
            displayWednesday: setDashboardToCurrentDay(weekday[3]),
            displayThursday: setDashboardToCurrentDay(weekday[4]),
            displayFriday: setDashboardToCurrentDay(weekday[5]),
            displaySaturday: setDashboardToCurrentDay(weekday[6]),
            editPath: '/postit/update',
            checkedPath: '/',
        };

        //render the logged in page
        response.render('loggedInPageSkeleton.hbs', pageData);

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showAuthenticationError('Database error! Unable to login User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showAuthenticationError('Unable to find User', 400, response);
        } else {
            showAuthenticationError('Unexpected error trying to login user.', 500, response);
        }
    }
}

/**
 * Verifies and removes existing session. Returns user to the home page.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
async function logout(request, response) {

    //check if the session exists
    const authenticatedSession = authenticateUser(request);
    if (!authenticatedSession) {
        response.sendStatus(401); // Unauthorized access //will be changed to page render
        return;
    }
    //delete the session
    delete sessions[authenticatedSession.sessionId]

    //("Logged out user " + authenticatedSession.userSession.username); add to the div

    //set cookie
    response.cookie("sessionId", "", { expires: new Date() }); // "erase" cookie by forcing it to expire.

    //render home page
    response.redirect('/');

    /**
     * Side notes: 
     * destroy the session
     * 
     * render the homepage with a div on top of that is only activated after logout
     * telling the user that they are logged out (put it in an if statement)
     * 
     * redirect to the welcome/home page
     */
}

/**
 * Creates an account for the user. If successful, the login form is rendered. 
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
async function register(request, response) {
    //user information
    const email = request.body.email;
    const password = request.body.password;
    const username = request.body.username;

    //icon is set to default
    const icon = ' ';

    try {
        //create user
        await userController.newUser(username, email, password, icon);

        //redirect to the login form
        response.redirect('/login');

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showAuthenticationError('Database error! Unable to login User', 500, response);
        } else if (error instanceof exceptions.userException) {
            showAuthenticationError('Unable to find User', 400, response);
        } else {
            showAuthenticationError('Unexpected error trying to login user.', 500, response);
        }
    }
}

/**
 * Renders the user's dashboard to the browser.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
async function showDashBoard(request, response) {

    var postIt;

    if (!authenticateUser(request)) {
        showAuthenticationError(`Unauthorized access`, 401, response);
    }

    //retrieve user from database
    const user = await userModel.findByUsername(getUsername());
    const userId = user.user_id;

    switch (request.body.choice) {

        case 'sunday':
            //getting post it for the day
            postIt = await buildDashboard(weekday[0], userId);
            const sundayPageData = {
                displayHomePage: false,
                displayLoggedInUser: true,
                displaySunday: true,
                currentDayDisplayed: weekday[0],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', sundayPageData);
            break;

        case 'monday':
            postIt = await buildDashboard(weekday[1], userId);
            const mondayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displayMonday: true,
                currentDayDisplayed: weekday[1],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', mondayPageData);
            break;

        case 'tuesday':
            postIt = await buildDashboard(weekday[2], userId);
            const tuesdayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displayTuesday: true,
                currentDayDisplayed: weekday[2],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', tuesdayPageData);
            break;

        case 'wednesday':
            postIt = await buildDashboard(weekday[3], userId);
            const wednesdayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displayWednesday: true,
                currentDayDisplayed: weekday[3],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', wednesdayPageData);
            break;

        case 'thursday':
            postIt = await buildDashboard(weekday[4], userId);
            const thursdayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displayThursday: true,
                currentDayDisplayed: weekday[4],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', thursdayPageData);
            break;

        case 'friday':
            postIt = await buildDashboard(weekday[5], userId);
            const fridayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displayFriday: true,
                currentDayDisplayed: weekday[5],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',
            }
            response.render('loggedInPageSkeleton.hbs', fridayPageData);
            break;

        case 'saturday':
            postIt = await buildDashboard(weekday[6], userId);
            const saturdayPageData = {
                displayUserNavBar: true,
                displayHomePage: false,
                displayLoggedInUser: true,
                displaySaturday: true,
                currentDayDisplayed: weekday[6],
                postItForDay: postIt,
                userNavBarContent: [
                    { title: 'Logout', path: '/logout' },
                    { title: `User Name Profile: ${loggedInUsername}`, path: `/user/${loggedInUsername}` }
                ],
                navBarContent: LOGGED_IN_NAV_BAR,
                checkedPath: '/',

            }
            response.render('loggedInPageSkeleton.hbs', saturdayPageData);
            break;

        default:
            response.render('loggedInPageSkeleton.hbs');
    }
}

/**
 * Gets the day of the week.
 * @returns The current day of the week.
 */
function getDayOfWeek() {
    const dayInMaking = new Date();
    var day = weekday[dayInMaking.getDay()];
    return day;
}

/**
 * Sets the dashboard to the day of the week.
 * @param {*} day The current day of the week.
 * @returns Returns true if the day matches the current day, otherwise returns false.
 */
function setDashboardToCurrentDay(day) {
    if (day.toLowerCase() == getDayOfWeek().toLowerCase()) {
        return true;
    } else {
        return false;
    }
}

async function buildDashboard(day, userId) {

    //get the post it for the user by day 
    try
    {
        day = day.toLowerCase();
        const dailyPostIt = await postItModel.findByWeekdayAndUserId(day, userId);

        return dailyPostIt;

    } catch (error)
    {
        if (error instanceof exceptions.databaseException) {
            //database error
            console.log(error.message);
        } else if (error instanceof exceptions.userException) {
            console.log(error.message);
        } else if (error instanceof postItModel.postItException) {
            console.log(error.message);
        } else {
            console.log(error.message);
        }
    }
}


function getUsername(){
    return loggedInUsername;
}




//Router endpoints
router.post('/home', showDashBoard);
router.get('/login', loginForm);
router.post('/login', login);
router.get('/logout', logout);
router.get('/register', registerForm);
router.post('/register', register);

module.exports = {
    router,
    routeRoot,
    loginForm,
    login,
    registerForm,
    logout,
    showDashBoard,
    authenticateUser,
    getUsername,
}