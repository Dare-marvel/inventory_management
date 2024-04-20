# [Sangrah Inventory Management System](https://rohit-sangrah.netlify.app/)

## Pls view the site in Firefox as setting cookies is part of a paid service in other browsers while hosting the site

Create config.env in server and put the below mentioned credentials
```
PORT = 8000
DATABASE = <PUT YOUR MONGO DB ATLAS URL>
SECRET_KEY = <ANY COMBINATION OF LETTERS YOU LIKE>
STRIPE_SECRET_KEY = "<PUT YOUR STRIPE SECRET KEY>"
```

For running server:
```
nodemon app
```

For running client:
```
npm start
```
