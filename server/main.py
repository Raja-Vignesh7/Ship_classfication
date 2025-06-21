import tensorflow as tf
import os
import pandas as pd
import cv2 as cv


class Model:
    model1 = None
    model2 = None
    model3 = None
    model1_path = os.path.join(os.path.dirname(__file__),'ship_classify_model2.h5')
    model2_path = os.path.join(os.path.dirname(__file__),'ship_classify_model3.h5')
    model3_path = os.path.join(os.path.dirname(__file__),'ship_classify_model4.h5')
    
    @staticmethod
    def load_model():
        # Load model
        if Model.model1 is None:
            Model.model1 = tf.keras.models.load_model(Model.model1_path)
        if Model.model2 is None:
            Model.model2 = tf.keras.models.load_model(Model.model2_path)
        if Model.model3 is None:
            Model.model3 = tf.keras.models.load_model(Model.model3_path)
    
    @staticmethod
    def predict(img_path):
        Model.load_model()
        try:
            # load image
            img = cv.imread(img_path)
            img = cv.resize(img, (224, 224))
            img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
            img = img.astype('float32') / 255.0  # Normalize
            img = img.reshape((1, 224, 224, 3))

            # Prediction
            pred1 = Model.model1.predict(img)
            pred2 = Model.model2.predict(img)
            pred3 = Model.model3.predict(img)
            pred1 = pred1.flatten()
            pred2 = pred2.flatten()
            pred3 = pred3.flatten()
            
            # pred = (pred1+pred2+pred3)/3
            pred = pred3
            
            m = max(pred)

            val_dict = {
                0: 'Cargo',
                1: 'Carrier',
                2: 'Cruise',
                3: 'Military',
                4: 'Tankers'
            }
            max_index = pred.argmax()
            result = val_dict[max_index]
            confidence = float(pred[max_index])  # Convert np.float32 to native float

            # Create a dictionary of all class predictions with their scores
            all_class_scores = {val_dict[i]: float(score*100) for i, score in enumerate(pred)}

            # print("Predicted Class:", result)
            # print("All Class Scores:", all_class_scores)

            return result, confidence*100, all_class_scores
        except Exception as e:
            return e



# # Paths
# img_path = 'C:\\Users\\bvrvg\\Desktop\\3rd_year_(2nd_sem)\\Smart Bridge project\\train\\images\\2784171.jpg'
# train_path = "C:\\Users\\bvrvg\\Desktop\\3rd_year_(2nd_sem)\\Smart Bridge project\\train\\train.csv"


# model = Model()

# print(model.predict(img_path))
# # Load CSV
# train_ds = pd.read_csv(train_path)

# # Read and preprocess image

# # Print full DataFrame (optional)
# # print(train_ds)
