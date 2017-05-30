var express       = require('express'),
    bodyParser    = require('body-parser'),
    logger        = require('morgan'),
    cookieParser  = require('cookie-parser'),
    sss           = require('simple-stats-server'),
    path          = require('path'),
    _             = require('lodash'),
    fs            = require("fs"),
    stats         = sss(),
    passwordFile  = __dirname + '/data/passwords.json',
    passwordsData = JSON.parse(fs.readFileSync(passwordFile));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('combined    '));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

var checkAllProperties = function (input) {
    var properties      = ['username', 'password', 'name', 'description', 'active'],
        inputProperties = [];

    for (var key in input) {
        if (input.hasOwnProperty(key)) {
            inputProperties.push(key);
        }
    }
    return _.isEqual(properties.sort(), inputProperties.sort());
};

// app.use('/', express.static(__dirname + '/docs'));
app.get('/', function (req, res, next) {
    return res.render('index');
});

app.get('/passwords', function (req, res) {
    return res.status(200).json(passwordsData);
});

app.get('/password/:username', function (req, res) {
    var username = req.params.username,
        result   = _.find(passwordsData, {"username": username});

    (result)
        ? res.status(200).send(result)
        : res.status(404).json({"error": "User " + username + " not found!"});

});

app.get('/password', function (req, res) {
    var query = req.query;

    if (_.isEmpty(query)) {
        res.status(404).json({"error": "No Query Params found to filter results!"});
    } else {
        var result = _.find(passwordsData, query);
        (result) ? res.status(200).send(result) : res.status(404).json({"error": "No Results Found!"});
    }
});

app.post('/password', bodyParser.json(), function (req, res) {
    var username    = req.body.username,
        password    = req.body.password,
        name        = req.body.name,
        description = req.body.desription || 'User for some operation',
        active      = req.body.active || false;

    if (!username || !password || !name) {
        res.status(404).json({"error": "Please make sure you have provided mandatory fields"});
    }

    if (_.find(passwordsData, {"username": username})) {
        res.status(404).json({"error": username + " already exists. Please choose a different unique username."});
    } else {
        passwordsData.push({
            "username": username,
            "password": password,
            "name": name,
            "description": description,
            "active": active
        });

        fs.writeFileSync(passwordFile, JSON.stringify(passwordsData, null, '\t'));
        res.end('username \"' + username + '\" created successfully.');
    }
});

app.put('/password/:username', bodyParser.json(), function (req, res) {
    var username = req.params.username,
        index    = _.findIndex(passwordsData, {"username": username}),
        newValue;

    if (!username) {
        res.status(404).json({"error": "username not found in the request."});
    }

    if (index && index >= 0) {
        newValue = {
            "username": username,
            "password": req.body.password || passwordsData[index].password,
            "name": req.body.name || passwordsData[index].name,
            "description": req.body.description || passwordsData[index].description,
            "active": req.body.active || passwordsData[index].active || false
        };

        passwordsData.splice(index, 1, newValue);
    } else {
        if (checkAllProperties(req.body) && (req.body.username === username)) {
            newValue = req.body;
            passwordsData.push(newValue)
        } else {
            res.status(404).json({"error": "Please provide all the necessary fields."});
        }
    }

    fs.writeFileSync(passwordFile, JSON.stringify(passwordsData, null, '\t'));
    res.end('username \"' + username + '\" updated successfully..');

});

app.delete('/password/:username', function (req, res) {
    var username = req.params.username;

    if (!username) {
        res.status(404).json({"error": "Please provide username to delete in the URL"});
    } else {
        passwordsData = _.reject(passwordsData, {"username": username});
        fs.writeFileSync(passwordFile, JSON.stringify(passwordsData, null, '\t'));
        res.end('Username: ' + username + ' deleted succussfully.');
    }
});

// app.use('/api', routes);
app.use('/stats', stats);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//     var err    = new Error('Not Found');
//     err.status = 404;
//     next(err);
// });

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {
            stack: err.stack
        },
    });
});

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
    });
});

module.exports = app;
