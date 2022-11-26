class databaseException extends Error {
    constructor(message) {
        super(message);
        this.name = "Database Exception";
    }
}

class colorException extends Error {
    constructor(message) {
        super(message);
        this.name = "Color Exception";
        this.message = message;

    }
}

class categoryException extends Error {
    constructor(message) {
        super(message);
        this.name = "Category Exception";
        this.message = message;
    }
};

class postItException extends Error {
    constructor(message) {
        super(message);
        this.name = "Post-It exception";
        this.message = message;
    }
}

class userException extends Error {
    constructor(message) {
        super(message);
        this.name = "User Exception";
        this.message = message;
    }
}

class authException extends Error {
    constructor(message) {
        super(message);
        this.name = "Authentication Exception";
        this.message = message;
    }
}

module.exports = {
    databaseException,
    userException,
    colorException,
    authException,
    postItException,
    categoryException,
}