from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from main import Model
import os
import shutil
import logging
import uuid
from datetime import datetime
import mimetypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class Config:
    
    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff'}
    ALLOWED_MIMETYPES = {
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 
        'image/bmp', 'image/webp', 'image/tiff'
    }
    
    # Directory paths
    BASE_DIR = os.path.join(os.path.dirname(__file__),'..')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR,'client','pages')
    STATIC_FOLDER = os.path.join(BASE_DIR,'client','static')
    TEMP_FOLDER = os.path.join( BASE_DIR,'server','temp')
    ARCIVE_FOLDER = os.path.join(BASE_DIR,'archive')

app = Flask(__name__,
            template_folder = Config.TEMPLATE_FOLDER,
            static_folder = Config.STATIC_FOLDER)

# Apply configuration
app.config.from_object(Config)
CORS(app)  # Enable CORS if needed for frontend

def create_folders():
    directories = [Config.TEMP_FOLDER,Config.ARCIVE_FOLDER]
    for directory in directories:
        try:
            os.makedirs(directory,exist_ok=True)
            logger.info(f"Directory enshured: {directory}")
        except Exception as e:
            logger.error(f"failed to create {directory}: {e}")


def allowed_file(file_name):
    if not file_name or '.' not in file_name:
        return False
    extension = file_name.rsplit('.', 1)[1].lower()
    return extension in Config.ALLOWED_EXTENSIONS

def validate_file_type(file):
    """Validate file type using both extension and MIME type"""
    if not file or not file.filename:
        return False, "No file provided"
    
    # Check extension
    if not allowed_file(file.filename):
        return False, f"File type not allowed. Allowed types: {', '.join(Config.ALLOWED_EXTENSIONS)}"
    
    # Check MIME type
    mimetype = file.content_type or mimetypes.guess_type(file.filename)[0]
    if mimetype not in Config.ALLOWED_MIMETYPES:
        return False, f"Invalid file format. Expected image file."
    
    return True, "Valid file"

def generate_unique_filename(filename):
    """Generate a unique filename to prevent conflicts"""
    if not filename:
        filename = "unknown_file"
    
    # Secure the filename
    filename = secure_filename(filename)
    
    # Add timestamp and UUID for uniqueness
    name, ext = os.path.splitext(filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    return f"{name}_{timestamp}_{unique_id}{ext}"

def cleanup_temp_files():
    """Clean up old temporary files"""
    try:
        temp_files = os.listdir(Config.TEMP_FOLDER)
        for file in temp_files:
            file_path = os.path.join(Config.TEMP_FOLDER, file)
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up temp file: {file}")
            except Exception as e:
                logger.warning(f"Failed to remove temp file {file}: {e}")
    except Exception as e:
        logger.error(f"Error during temp cleanup: {e}")

def safe_file_operation(source_path, dest_path, operation='move'):
    """Safely perform file operations with error handling"""
    try:
        if operation == 'move':
            shutil.move(source_path, dest_path)
        elif operation == 'copy':
            shutil.copy2(source_path, dest_path)
        else:
            raise ValueError(f"Unsupported operation: {operation}")
        
        logger.info(f"File {operation}d: {source_path} -> {dest_path}")
        return True, f"File {operation}d successfully"
    except Exception as e:
        logger.error(f"File {operation} failed: {source_path} -> {dest_path}, Error: {e}")
        return False, str(e)

# Initialize directories on startup
create_folders()

@app.route('/')
def get_index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error serving index page: {e}")
        return jsonify({"error: Falied to load page"}) , 500
    
@app.route('/classify',methods=['POST'])
def classify():
    
    # file validation check
    if 'image' not in request.files:
        logger.warning(f"Request recived without image file")
        return jsonify({'error: no image file'}) , 400
    file = request.files['image']
    
    is_valid , validation_message = validate_file_type(file)
    if not is_valid:
        logger.error(f"file is validation failed: {validation_message}")
        return jsonify({'error': validation_message}) , 400
    
    try:
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        temp_file_path = os.path.join(Config.TEMP_FOLDER, unique_filename)
        archive_file_path = os.path.join(Config.ARCIVE_FOLDER, unique_filename)
        
        # Save uploaded file
        file.save(temp_file_path)
        logger.info(f"File saved to temp: {temp_file_path}")
        
        # Verify file was saved and is readable
        if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
            raise Exception("File was not saved properly or is empty")
        
        logger.info(f"Starting prediction, file - {temp_file_path}")
        model = Model
        classification, confidence, all_classes_score = model.predict(temp_file_path)
        logger.info(f"Prediction completed. Value: {classification}, confidence: {confidence}")
        logger.info(f"all classes scores: {all_classes_score}")
        
        # Archive the file
        success, message = safe_file_operation(temp_file_path, archive_file_path, 'move')
        if not success:
            logger.warning(f"Failed to archive file: {message}")
            # Continue anyway, as prediction was successful
        result = f"The image is Likely {classification}. Confidence: {confidence:.2f}%"
        response_data = {
            "success" : True,
            "result" : result,
            "confidence": round(confidence, 2),
            "raw_prediction": float(confidence),
            "all_classes_score": all_classes_score,
            "filename": unique_filename,
            "timestamp": datetime.now().isoformat()
        }
        logger.info(f"Analysis completed successfully: {classification} ({confidence:.2f}%)")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Prediction error for file {file.filename}: {e}")
        
        # Clean up temp file if it exists
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temp file after error: {temp_file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup temp file: {cleanup_error}")
        
        return jsonify({
            'success': False,
            'error': f'Analysis failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500
        
        
        

# Error handlers
@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    logger.warning("File upload rejected: too large")
    return jsonify({
        'error': f'File too large. Maximum size allowed: {Config.MAX_CONTENT_LENGTH // (1024*1024)}MB'
    }), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {e}")
    return jsonify({'error': 'An unexpected error occurred'}), 500

# Cleanup function for graceful shutdown
def cleanup_on_exit():
    """Cleanup function to run on app shutdown"""
    logger.info("Performing cleanup on shutdown...")
    cleanup_temp_files()
    

if __name__ == "__main__":
    try:
        logger.info("Starting Ship Classification Server...")
        logger.info(f"Server configuration:")
        logger.info(f"  - Max file size: {Config.MAX_CONTENT_LENGTH // (1024*1024)}MB")
        logger.info(f"  - Allowed extensions: {Config.ALLOWED_EXTENSIONS}")
        logger.info(f"  - Temp folder: {Config.TEMP_FOLDER}")
        logger.info(f"  - Archive folder: {Config.ARCIVE_FOLDER}")
        
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    finally:
        cleanup_on_exit()

# img_path = 'C:\\Users\\bvrvg\\Desktop\\3rd_year_(2nd_sem)\\Smart Bridge project\\train\\images\\2784171.jpg'
# print(Model.predict(img_path))