# 🚢 Ship Classification System

This project is a web-based deep learning application for **classifying ship types** using fine-tuned **VGG16** models. It supports image uploads through a web interface built with **Flask**, processes and predicts the ship class, and returns detailed class probabilities.

### 🔍 Dataset Used

* **Dataset**: [Game of Deep Learning: Ship Datasets](https://www.kaggle.com/datasets/arpitjain007/game-of-deep-learning-ship-datasets)
* **Classes**:

  * Cargo
  * Carrier
  * Cruise
  * Military
  * Tankers

---

## 📊 Performance Summary

| Metric            | Value                                   |
| ----------------- | --------------------------------------- |
| **Test Accuracy** | 88.04%                                  |
| **Test Loss**     | 0.705                                   |
| **Model Used**    | VGG16 (Frozen base + custom classifier) |
| **Best Model**    | Model 3 (ship\_classify\_model4.h5)     |

Despite high test accuracy, class-wise metrics reveal class imbalance, with most precision/recall around \~20%.

---

## 🧠 Model Architecture

```python
VGG16 (pretrained on ImageNet, include_top=False)
↓
Flatten
↓
Dense(64, ReLU)
↓
Dense(16, ReLU)
↓
Dropout(0.2)
↓
Dense(5, Softmax)
```

* **Loss Function**: Sparse Categorical Crossentropy
* **Optimizer**: Customizable (passed as argument)
* **Callbacks**:

  * `ReduceLROnPlateau` — Dynamically lowers learning rate when `val_loss` plateaus
  * `EarlyStopping` — Stops training when no improvement in `val_loss`

---

## 🛠️ Features

* **Image Upload API** via `/classify`
* **Multi-model inference** using an ensemble structure (3 models supported)
* **Clean separation of frontend (HTML) and backend (Flask + TensorFlow)**
* **Logging** of requests and responses with detailed error handling
* **Automatic file cleanup** and archival
* **CORS support** for frontend-backend integration

---

## 📁 Folder Structure

```
├── /client
│   ├── /pages             # Frontend HTML pages
│   └── /static            # CSS / JS / Images
├── /server
│   ├── /temp              # Temporary uploaded files
│   ├── app.py                 # Flask API
│   ├── main.py                # Model loading and prediction logic
│   ├── ship_classify_model2.h5
│   ├── ship_classify_model3.h5
│   └── ship_classify_model4.h5
├── /archive               # Archive for processed images
├── app.log                # Logging file
```

---

## 🧪 API Usage

### POST `/classify`

Upload an image to classify ship type.

**Form field**: `image`
**Supported formats**: `jpg`, `jpeg`, `png`, `gif`, `bmp`, `webp`, `tiff`

**Example Response**:

```json
{
  "success": true,
  "result": "The image is Likely Military. Confidence: 91.24%",
  "confidence": 91.24,
  "raw_prediction": 91.24,
  "all_classes_score": {
    "Cargo": 1.23,
    "Carrier": 2.10,
    "Cruise": 3.42,
    "Military": 91.24,
    "Tankers": 2.01
  },
  "filename": "uploaded_ship_20240621_173000_abc123.jpg",
  "timestamp": "2025-06-21T17:30:00"
}
```

---

## 🚀 Running the App

### 1. Clone the Repository

```bash
git clone https://github.com/Raja-Vignesh7/Ship_classfication.git
cd ship-classification
```

### 2. Install Requirements

```bash
pip install -r requirements.txt
```

### 3. Run the Server

```bash
python app.py
```

The app will be accessible at `http://localhost:5000/`

---

## 📈 Evaluation Summary

| Class    | Precision | Recall | F1-Score |
| -------- | --------- | ------ | -------- |
| Cargo    | 0.21      | 0.23   | 0.22     |
| Carrier  | 0.21      | 0.21   | 0.21     |
| Cruise   | 0.20      | 0.18   | 0.19     |
| Military | 0.21      | 0.23   | 0.22     |
| Tankers  | 0.17      | 0.15   | 0.16     |

⚠️ **Observation**: While overall accuracy is high, class-wise performance is low due to class imbalance. Addressing this via data augmentation or weighted loss could improve generalization.

---

## 🧹 Cleanup and Shutdown

On shutdown, temporary files are cleaned automatically.

---

## 💡 Future Work

* Improve class balancing through data augmentation or oversampling
* Use Grad-CAM for visual explanation
* Deploy with Docker or a cloud service (Heroku, AWS)
* Build a modern frontend using React or Vue

---

## 👨‍💻 Author

**Raja Vignesh**
SmartBridge Deep Learning Project (2025)

