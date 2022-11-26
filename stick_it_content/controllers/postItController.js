const express = require('express');
const router = express.Router();
const routeRoot = '/';
const exceptions = require('../models/exceptions/errors');

//Models
const postItModel = require('../models/postItModel');
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');
const { route } = require('express/lib/router');

//Controllers
const authController = require('../controllers/authController');
const res = require('express/lib/response');

/**
 * Renders page with provided success message. 
 * @param {string} message The success message for the CRUD operations.
 * @param {*} response Tracks status of the controller.
 */
function showPostItMessage(message, response) {
    response.render('.hbs', { message: message });
}

/**
 * Renders the error page with the given error message.
 * @param {string} message The failure message for the CRUD operations.
 * @param {number} status The status code for the failed operation.
 * @param {*} response Tracks status of the controller.
 */
function showPostItError(message, status, response) {
    response.render('errorPage.hbs', { message: message, status: status });
}

/**
 * Renders the forms to operate a post-it.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
function showForms(request, response) {
    response.render('postItPage.hbs');
}


/**
 * Redirects to add post-it.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
 async function redirectAddPostIt(request, response) {

    if (!authController.authenticateUser(request)) {
        authController.showAuthenticationError(`Unauthorized access`, 401, response);
    }


    const user = await userModel.findByUsername(authController.getUsername());
    const userId = user.user_id;
    const availableCategories = await categoryModel.findAllByUserId(userId);
    const pageData = {
        message: "HELLO",
        category: availableCategories
    };
    response.render('addPostIt.hbs', pageData);
}

router.get('/postit', redirectAddPostIt);

/**
 * Creates a new postIt via the postItModel.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function newPostIt(request, response) {

    try {
        
        if (!authController.authenticateUser(request)) {
            authController.showAuthenticationError(`Unauthorized access`, 401, response);
        }

        //retrieve user from database
        const user = await userModel.findByUsername(authController.getUsername());
        const userId = user.user_id;

        //retrieve category from database
        const category = await categoryModel.findByTitle(request.body.category);
        const cateogryId = category[0][0].category_id;

        //checking if the post it is pinned
        const pinned = (request.body.pinned == "on") ? "T" : "F";

        //check if user exists
        if (user instanceof exceptions.userException) {
            showPostItError('Post-it NOT created! User does not exist', 400, response);
        }
        //check if category exists
        else if (category instanceof categoryModel.categoryException) {
            showPostItError('Post-it NOT created! Category does not exist', 400, response);
        } else
        {
            //create post-it 
            const postIt = await postItModel.createPostIt(userId, cateogryId, request.body.title, request.body.description, pinned, request.body.weekday);

            //check if insertion was successful
            if (postIt instanceof postItModel.postItException) {
                showPostItError('Post-it NOT created!', 400, response);
            } else if (postIt) {

                const pageData = {
                    message: `Post-it: ${postIt[0][0].title} created successfully!`
                }

                response.render('successAdded.hbs', pageData);

            }
        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to add Post-it', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it NOT created!', 400, response);
        } else {
            showPostItError('Unexpected error trying to add Post-it.', 500, response);
        }
    }
}

router.post('/postit', newPostIt);


/**
 * Shows a specified post-it using the title.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function showPostIt(request, response) {
    try {
        //retrieve post-it from the database
        const postIt = await postItModel.findByTitle(request.body.title);

        //check if the post-it exists
        if (postIt instanceof postItModel.postItException) {
            showPostItError('Post-it NOT found!', 400, response);
        } else if (postIt) {
            showPostItMessage(`Post-it: ${postIt[0][0].title} found successfully!`, response);
        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to find Post-it', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it NOT found!', 400, response);
        } else {
            showPostItError('Unexpected error trying to find Post-it.', 500, response);
        }
    }
}


/**
 * Shows all post-its in the database.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function showAllPostIts(request, response) {
    try {

        if (!authController.authenticateUser(request)) {
            authController.showAuthenticationError(`Unauthorized access`, 401, response);
        }

        //retrieve user from database
        const user = await userModel.findByUsername(authController.getUsername());
        const userId = user.user_id;

        //retrieve all post-its
        const postIts = await postItModel.findAllByUserId(userId);

        //check if the post-its exist
        if (postIts instanceof postItModel.postItException) {
            showPostItError('Post-its NOT found!', 400, response);
        } else if (postIts) {

            const pageData = {
                postIt: postIts,
                message: "ALL POST IT FOR USER"
            }

            response.render('showAllPostIts.hbs', pageData);

        }
    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to find Post-its', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-its NOT found!', 400, response);
        } else {
            showPostItError('Unexpected error trying to find Post-its.', 500, response);
        }
    }
}
router.get('/postits', showAllPostIts);

/**
 * Updates a specific post-it.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
 async function redirectUpdatePostIt(request, response) {
    try {

        if (!authController.authenticateUser(request)) {
            authController.showAuthenticationError(`Unauthorized access`, 401, response);
        }
    
        const user = await userModel.findByUsername(authController.getUsername());
        const userId = user.user_id;
        const availableCategories = await categoryModel.findAllByUserId(userId);

        const postIt = await postItModel.findById(request.params.post_it);
        const pageData = {
            message: "UPDATE POST IT",
            category: availableCategories,
            currentPostIt: postIt,
            originalPostItId: postIt[0].post_id
        };
        response.render('updatePostIt.hbs', pageData);

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to update Post-it', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it NOT updated!', 400, response);
        } else {
            showPostItError('Unexpected error trying to update Post-it.', 500, response);
        }
    }
}
router.get('/update/:post_it', redirectUpdatePostIt);

/**
 * Updates a specific post-it.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function updatePostIt(request, response) {
    try {
        //checking if the post it is pinned
        const pinned = (request.body.pinned == "on") ? "T" : "F";
        const originalPostIt = await postItModel.findById(request.body.post_id);
        const originalTitle = originalPostIt[0].title;
        //update post-it in the model
        const postIt = await postItModel.updatePostIt(originalTitle, request.body.description, request.body.weekday, request.body.category, pinned);

        //check if the update was successful
        if (postIt instanceof postItModel.postItException) {
            showPostItError('Post-it NOT updated!', 400, response);
        } else if (postIt != null) {

            const pageData = {
                message: "SUCCESSFULLY UPDATED POST IT",
            };
            response.render('successAdded.hbs', pageData);
        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to update Post-it', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it NOT updated!', 400, response);
        } else {
            showPostItError('Unexpected error trying to update Post-it.', 500, response);
        }
    }
}
router.post('/postit/update', updatePostIt);
/**
 * Delete a specified post-it from the database.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks the status of the controller.
 */
async function destroyPostIt(request, response) {

    try {
        if (!authController.authenticateUser(request)) {
            authController.showAuthenticationError(`Unauthorized access`, 401, response);
        }
    
        const user = await userModel.findByUsername(authController.getUsername());
        const userId = user.user_id;
        

        //delete post-it from the model
        const postIt = await postItModel.deletePostItById(request.params.post_it);


        //check if delete was a success
        if (postIt instanceof postItModel.postItException) {
            showPostItError('Post-it NOT deleted!', 400, response);
        } else if (postIt) {

            const pageData = {
                message: "SUCCESSFULLY REMOVED POST IT",
            };
            response.render('successAdded.hbs', pageData);
        }

    } catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to delete Post-it', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it NOT deleted!', 400, response);
        } else {
            showPostItError('Unexpected error trying to delete Post-it.', 500, response);
        }
    }
}

router.post('/postit/delete/:post_it', destroyPostIt);

async function markPostItAsCompleted(request, response) {
    if (!authController.authenticateUser(request)) {
        authController.showAuthenticationError(`Unauthorized access`, 401, response);
    }

    const user = await userModel.findByUsername(authController.getUsername());
    const userId = user.user_id;

    try{
        //delete post-it from the model
        const postIt = await postItModel.setPostItAsCompleted(request.params.postit);

        //check if delete was a success
        if (postIt instanceof postItModel.postItException) {
            showPostItError('Post-it NOT marked as completed!', 400, response);
        } else if (postIt) {

            const pageData = {
                message: "Good job! You completed your task!",
            };
            response.render('successAdded.hbs', pageData);
        }

    }
    catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to mark Post-it as completed.', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-it was NOT marked as completed!', 400, response);
        } else {
            showPostItError('Unexpected error trying to mark Post-it as completed.', 500, response);
        }
    }

}

router.post('/postit/complete/:postit', markPostItAsCompleted);


async function showAllCompletedPostIts(request, response) {

    if (!authController.authenticateUser(request)) {
        authController.showAuthenticationError(`Unauthorized access`, 401, response);
    }

    try{ 
        //retrieve user from database
        const user = await userModel.findByUsername(authController.getUsername());
        const userId = user.user_id;

        //retrieve all post-its
        const postIts = await postItModel.findAllCompletedPostIt(userId);

        //check if the post-its exist
        if (postIts instanceof postItModel.postItException) {
            showPostItError('Post-its NOT found!', 400, response);
        } else if (postIts) {

            const pageData = {
                postIt: postIts,
                message: "ALL COMPLETED POST IT FOR USER"
            }

            response.render('showAllPostIts.hbs', pageData);
        }
    }
    catch (error) {
        if (error instanceof exceptions.databaseException) {
            //database error
            showPostItError('Database error! Unable to find Post-its', 500, response);
        } else if (error instanceof exceptions.userException) {
            showPostItError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showPostItError('Unexpected error with Category.', 400, response);
        } else if (error instanceof postItModel.postItException) {
            showPostItError('Post-its NOT found!', 400, response);
        } else {
            showPostItError('Unexpected error trying to find Post-its.', 500, response);
        }
    }
}

router.get('/complete', showAllCompletedPostIts);

// router.get('/postitform', showForms);


module.exports = {
    router,
    routeRoot,
    newPostIt,
    showPostIt,
    showAllPostIts,
    showAllCompletedPostIts,
    updatePostIt,
    destroyPostIt,
    showPostItMessage,
    showPostItError,
    redirectUpdatePostIt,
    showForms,
    markPostItAsCompleted
}