from flask import Flask, jsonify, request, render_template
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load the CSV data
try:
    data = pd.read_csv("dump.csv")
except FileNotFoundError:
    print("Error: 'dump.csv' file not found.")
    data = pd.DataFrame()  # Create an empty DataFrame if file is missing

@app.route('/', methods=['GET'])
def home():
    return render_template('frontend.html')

@app.route('/companies', methods=['GET'])
def get_companies():
    """Return a list of unique company names."""
    if data.empty:
        return jsonify({'error': 'No company data available'}), 500
    
    companies = data['index_name'].dropna().unique().tolist()
    return jsonify({'companies': companies})

@app.route('/company/<name>', methods=['GET'])
def get_company_data(name):
    """Return stock data for a given company with NaN handling."""
    if data.empty:
        return jsonify({'error': 'No data available'}), 500

    company_data = data[data['index_name'] == name]

    if company_data.empty:
        return jsonify({'error': 'Company not found'}), 404

    # Replace NaN values with "No Data"
    company_data = company_data.fillna("No Data")

    return jsonify(company_data.to_dict(orient='records'))


if __name__ == '__main__':
    app.run(debug=True, port=5000)
    app.logger.info("Server started")
