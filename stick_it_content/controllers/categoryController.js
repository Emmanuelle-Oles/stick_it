const express = require('express');
const router = express.Router();
const routeRoot = '/';

//Temporarily storing the array here 


//Models
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');
const colorModel = require('../models/colorModel');
const {route} = require('express/lib/router');
const err = require('../models/exceptions/errors');


//Controllers
const authController = require('../controllers/authController');

/**
 * Renders page with provided success message. 
 * @param {string} message The success message for the CRUD operations.
 * @param {*} response Tracks status of the controller.
 */
function showCategoryMessage(message, response) {
    response.render('categoryPage.hbs', { message: message, colors: colors });
}

/**
 * Renders the error page with the given error message.
 * @param {string} message The failure message for the CRUD operations.
 * @param {number} status The status code for the failed operation.
 * @param {*} response Tracks status of the controller.
 */
function showCategoryError(message, status, response) {
    response.render('errorPage.hbs', { message: message, status: status });
}
async function deleteSelected(request, response) {
    let theReturn = request.params.category_id;
    await categoryModel.deleteCategoryById(theReturn);
    
    response.redirect('/categories');
    console.log('hi');
}
/**
 * Renders the forms to operate a category.
 * @param {*} request Input parameters given by the user.
 * @param {*} response Tracks status of the controller.
 */
async function showForms(request, response) {
    try{
        if (!authController.authenticateUser(request)) {
            authController.showAuthenticationError(`Unauthorized access`, 401, response);
        }
        const availableColors = await colorModel.getAvailableColorNames();
        if(availableColors){
            const pageData = {
                message: "Adding Category",
                colors: availableColors[0]
            }
            // const user = authController.getUsername();
            const test = authController.loggedInUsername;
            //const sessionArray = request.cookies.sessionId;
            //console.log(sessionArray);
            response.render('addCategory.hbs', pageData);
            
            // response.render('categoryPage.hbs', {colors:availableColors[0]});
        }
        else{
            showCategoryError("Error retrieving colors", 500, response);
        }

    }
    catch(error)
    {
        console.log(error);
    }

    // Getting the data to create the page from the model

    

}
router.get('/category', showForms);

// /**
//  * Renders a page containing all the categories in the database.
//  * @param {string} message The success message for the operation.
//  * @param {Array} category An array of all the categories.
//  * @param {*} response Tracks status of the controller.
//  */
// function allCategories(message, category, response) {
//     response.render('showAllCategories.hbs', { message: message, category: category });
// }

async function getCategoryFormInput(request, response) {
    try {
        //For testing purposes, change to the one retrieved from the cookie
        const userid = 1;
        const user = authController.loggedInUsername;
        const userId =await userModel.findByUsername(authController.loggedInUsername);

        await categoryModel.createNewCategory(request.body.name, request.body.description, request.body.color, userid);
        //set category in color table
        const newCategory = await categoryModel.getCategoryIdByAssignedColor(request.body.color);
        //newCategory[0].category_id will give the id of the latest category
        const returnedColor = await colorModel.assignCategoryToColor(newCategory[0].category_id, request.body.color);

        console.log(newCategory);
        response.render('showCategories.hbs', { message:`'${request.body.name}' Added successfully`});
    } catch (error) {
        
        console.log(error);

    }
}
router.post('/categoryform', getCategoryFormInput);

/**
 * Creates a new category using category model.
 * @param {*} request Data given to create category.
 * @param {*} response Contains the data to inform the user about the status of the category.
 */
async function newCategory(request, response) {
    try {
        //check if user exists
        const user = await userModel.findById(request.body.userId);

        if (user instanceof userModel.userException) {
            showCategoryError('Category NOT created! User does not exist', 400, response);
        } else {
            //create category
            const category = await categoryModel.createCategory(request.body.userId, request.body.title, request.body.description, request.body.colorCode);

            //check if insertion was successful
            if (category instanceof categoryModel.categoryException) {
                showCategoryError('Category NOT created!', 400, response);
            } else if (category) {
                showCategoryMessage(`Category: ${category[0][0].title} was created successfully!`, response);
            }
        }
    } catch (error) {
        if (error instanceof userModel.databaseException) {
            //database error
            showCategoryError('Database error! Unable to add Category', 500, response);
        } else if (error instanceof userModel.userException) {
            showCategoryError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT created!', 400, response);
        } else {
            showCategoryError('Unexpected error trying to add category.', 500, response);
        }
    }
}


/**
 * Shows a specific category.
 * @param {*} request Data given to find category.
 * @param {*} response Contains the data to inform the user about the status of the category.
 */
async function showCategory(request, response) {
    try {
        //find category in database
        const category = await categoryModel.findByTitle(request.query.title);

        //check if the search was successful
        if (category instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT found!', 400, response);
        } else if (category) {
            showCategoryMessage(`Category: ${category[0][0].title} was found successfully!`, response);
        }

    } catch (error) {
        if (error instanceof userModel.databaseException) {
            //database error
            showCategoryError('Database error! Unable to find Category', 500, response);
        } else if (error instanceof userModel.userException) {
            showCategoryError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT found!', 400, response);
        } else {
            showCategoryError('Unexpected error trying to find category.', 500, response);
        }
    }
}

/**
 * Shows all categories in the database.
 * @param {*} request Data given to show category.
 * @param {*} response Contains the data to inform the user about the status of the category.
 */
async function showAllCategories(request, response) {
    try {
        //response.render('showAllCategories');
        //retrieve the categories from the database
        const category = await categoryModel.findAll();



        //check if the search was successful
        if (category instanceof categoryModel.categoryException) {
            showCategoryError('Categories NOT found!', 400, response);
        } else if (category) {
            // allCategories('Categories found successfully!', category[0], response);
            const pageData = 
            {
                category: category[0]
    
            };
    
            response.render('showAllCategories.hbs', pageData);
    
        }


        
    } catch (error) {
        if (error instanceof userModel.databaseException) {
            //database error
            showCategoryError('Database error! Unable to find Categories', 500, response);
        } else if (error instanceof userModel.userException) {
            showCategoryError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showCategoryError('Categories NOT found!', 400, response);
        } else {
            showCategoryError('Unexpected error trying to find categories.', 500, response);
        }
    }
}

/**
 * Edit a specific category in the database.
 * @param {*} request Data given to update category.
 * @param {*} response Contains the data to inform the user about the status of the category.
 */
async function updateCategory(request, response) {
    try {
        //update category in the model
        const category = await categoryModel.updateCategory(request.body.title, request.body.description);

        //check if the update was successful
        if (category instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT updated!', 400, response);
        } else if (category) {
            showCategoryMessage(`Category: ${category[0][0].title} was updated successfully!`, response);
        }
    } catch (error) {
        if (error instanceof userModel.databaseException) {
            //database error
            showCategoryError('Database error! Unable to update Category', 500, response);
        } else if (error instanceof userModel.userException) {
            showCategoryError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT updated!', 400, response);
        } else {
            showCategoryError('Unexpected error trying to update category.', 500, response);
        }
    }
}

/**
 * Delete a specific category from the database.
 * @param {*} request Data given to delete category.
 * @param {*} response Contains the data to inform the user about the status of the category.
 */
async function destroyCategory(request, response) {
    try {
        //delete the category in the model
        const category = await categoryModel.deleteCategory(request.body.title);

        //check if the delete was successful
        if (category instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT deleted!', 400, response);
        } else if (category) {
            showCategoryMessage(`Category with title: ${request.body.title} was deleted successfully!`, response);
        }

    } catch (error) {
        if (error instanceof userModel.databaseException) {
            //database error
            showCategoryError('Database error! Unable to delete Category', 500, response);
        } else if (error instanceof userModel.userException) {
            showCategoryError('Unexpected error with User.', 400, response);
        } else if (error instanceof categoryModel.categoryException) {
            showCategoryError('Category NOT deleted!', 400, response);
        } else {
            showCategoryError('Unexpected error trying to delete category.', 500, response);
        }
    }
}

router.post('/category/delete/:category_id', deleteSelected);
//hbs helper function(s)



//routers HTTP methods
//router.post('/category', newCategory);
// router.get('/category', showCategory);



//Implement if everything is done
// router.post('/category/update', updateCategory);





module.exports = {
    router,
    routeRoot,
    newCategory,
    showCategory,
    showAllCategories,
    updateCategory,
    destroyCategory,
    showCategoryMessage,
    showCategoryError,
    showForms,
    //allCategories,
    deleteSelected
}