from flask import Flask
from flask_cors import CORS
from database.db import db
from api.routes import api
import os

app = Flask(__name__)
CORS(app) # Enable CORS for frontend

# Configure SQLite
if os.environ.get('FLASK_ENV') == 'testing':
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
else:
    db_path = os.path.join(os.path.dirname(__file__), 'gridwise.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Register Blueprints
app.register_blueprint(api, url_prefix='/api')

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create tables
        print("Database initialized.")
    
    app.run(debug=True, port=5000)
