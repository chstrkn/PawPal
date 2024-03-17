import React, {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Image,
  Alert,
  StyleProp,
  ViewStyle,
  TextStyle,
  FlatList,
  Button,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import * as icons from '../imports/icons/icons';
import {
  FIREBASE_DB,
  FIREBASE_AUTH,
  FIREBASE_STORAGE,
} from '../../firebase.config';
import {getDocs, collection, updateDoc, doc} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

const PawPalApp = () => {
  const navigation = useNavigation();

  const db = FIREBASE_DB;
  const auth = FIREBASE_AUTH;
  const storage = FIREBASE_STORAGE;

  const [selectedImage, setSelectedImage] = useState('');
  const [number, setNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState([
    {day: '', open: '', close: ''},
  ]);

  const daysOfWeek = [
    {day: 'Monday'},
    {day: 'Tuesday'},
    {day: 'Wednesday'},
    {day: 'Thursday'},
    {day: 'Friday'},
    {day: 'Saturday'},
    {day: 'Sunday'},
  ];

  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState('time');
  const [openshow, setOpenShow] = useState(false);
  const [closeshow, setCloseShow] = useState(false);
  const [currentDay, setCurrentDay] = useState('');

  const [tagsInput, setTagsInput] = useState([]);

  const saveClinicInfo = async () => {
    try {
      const userQuery = await getDocs(collection(db, 'user'));
      userQuery.forEach(async currentDoc => {
        if (currentDoc.data().userId === auth.currentUser?.uid) {
          const userRef = doc(collection(db, 'user'), currentDoc.id);
          const updateData = {
            clinicPicture: selectedImage,
            services: tagsInput,
            contactInfo: number,
            about: description,
            storeHours: selectedDays,
            location: mapRegion,
            address: await getAddress(),
          };
          if (selectedImage) {
            const metadata = {
              contentType: 'image/jpeg', 
            };

            const storageRef = ref(
              storage,
              `clinicPicture/${auth.currentUser?.uid}.jpeg`,
            );

            // Convert image URI to Blob
            const response = await fetch(selectedImage);
            const blob = await response.blob();

            // Upload the image to Firebase Storage
            await uploadBytes(storageRef, blob, metadata);

            // Get the download URL of the uploaded image
            const imageUrl = await getDownloadURL(storageRef);

            updateData.clinicPicture = imageUrl;
          }
          try {
            await updateDoc(userRef, updateData);
            Alert.alert('Profile updated successfully');
            navigation.reset({
              index: 0,
              routes: [{name: 'HomePage'}],
            });
          } catch (updateError) {
            console.error('Error updating profile:', updateError);
            Alert.alert('Error updating clinic profile. Please try again.');
          }
        }
      });
    } catch (error) {
      console.log('Error querying user data: ', error);
      Alert.alert('Error updating clinic details. Please try again.');
    }
  };

  const skipAddClinic = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'HomePage'}],
    });
  };

  interface AppButtonProps {
    onPress: () => void;
    title: string;
    buttonStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
  }
  const AppButton: React.FC<AppButtonProps> = ({
    onPress,
    title,
    buttonStyle,
    textStyle,
  }) => (
    <TouchableOpacity onPress={onPress} style={[buttonStyle]}>
      <Text style={[textStyle]}>{title}</Text>
    </TouchableOpacity>
  );

  const [isInputVisible, setInputVisible] = useState(false);

  const handleSaveTagInput = () => {
    handleTagsChange(tags);
    Alert.alert('Services tags updated successfully');
    setInputVisible(!isInputVisible);
  };

  const handleToggleInput = () => {
    setInputVisible(!isInputVisible);
  };

  const handleTagsChange = updatedTags => {
    setTagsInput(updatedTags);
  };

  const openImagePicker = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        console.log('Image picker error: ', response.errorMessage);
      } else {
        let imageUri = response.uri || response.assets?.[0]?.uri;
        setSelectedImage(imageUri);
      }
    });
  };

  const [tags, setTags] = useState([]);
  const [tagVal, setTagVal] = useState('');

  function addTag() {
    if (tagVal.trim() !== '') {
      setTags([...tags, tagVal]);
      setTagVal(''); // Clear the input field after adding a tag
    }
  }

  function removeTag(indexToRemove) {
    const updatedTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(updatedTags);
  }

  const toggleDaySelection = day => {
    const existingDay = selectedDays.find(daysOfWeek => daysOfWeek.day === day);

    if (existingDay) {
      setSelectedDays(
        selectedDays.filter(selectedDay => selectedDay.day !== day),
      );
    } else {
      setSelectedDays([...selectedDays, {day, open: '', close: ''}]);
    }
  };

  const showOpenTimepicker = day => {
    setOpenShow(true);
    setMode('time');
    setCurrentDay(day);
  };

  const showCloseTimepicker = day => {
    setCloseShow(true);
    setMode('time');
    setCurrentDay(day);
  };

  const onChangeOpenTime = (_, selectedDate) => {
    const currentDate = selectedDate || date;
    setOpenShow(false);

    const formattedTime = currentDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Update the selected day's open or close time based on the current mode
    const updatedDays = selectedDays.map(selectedDay =>
      selectedDay.day === currentDay
        ? {
            ...selectedDay,
            [mode === 'time' ? 'open' : '']: formattedTime,
          }
        : selectedDay,
    );

    setSelectedDays(updatedDays);
  };

  const onChangeCloseTime = (_, selectedDate) => {
    const currentDate = selectedDate || date;
    setCloseShow(false);

    const formattedTime = currentDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Update the selected day's open or close time based on the current mode
    const updatedDays = selectedDays.map(selectedDay =>
      selectedDay.day === currentDay
        ? {
            ...selectedDay,
            [mode === 'time' ? 'close' : 'close']: formattedTime,
          }
        : selectedDay,
    );

    setSelectedDays(updatedDays);
    console.log(selectedDays);
  };

  const [mapRegion, setMapRegion] = useState({
    latitude: 10.7202,
    longitude: 122.5621,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const handleRegionChange = region => {
    setMapRegion(region);
  };

  const getAddress = async () => {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${mapRegion.latitude},${mapRegion.longitude}&key=AIzaSyBKZoguQ4iBcqCuDqOSkj6OpPskqaY7epg`,
    );
    const data = await response.json();
    const address = data.results[0].formatted_address.split(',');
    address.pop();
    return address.join(',');
  };

  return (
    <SafeAreaView style={styles.safeView}>
      <View style={styles.safeView1}>
        <View style={styles.safeView2}>
          <Image
            source={require('../images/Ellipse_25.png')}
            style={styles.img} />
        </View>

        <View>
          <Image
            source={require('../images/Vector_12.png')}
            style={styles.img1} />
        </View>
        <View style={styles.safeView2}>
          <Image
            source={require('../images/pug.png')}
            style={styles.img2} />
        </View>

        <View>
          <Image
            source={require('../images/Ellipse_24.png')}
            style={styles.img3} />
        </View>
        <View>
          <Image
            source={require('../images/Vector_11.png')}
            style={styles.img4} />
        </View>
      </View>

      <ScrollView>
        <View
          style={styles.scrollView}>
          <View>
            <Image
              source={require('../images/Vector_8.png')}
              style={styles.img5}
            />
          </View>

          <View>
            <Image
              source={require('../images/Vector_7.png')}
              style={styles.img6}
            />
          </View>

          <Text style={styles.clinic}>Clinic Details</Text>

          <Text style={styles.addClinic}>Add Clinic Picture</Text>
          <TouchableOpacity onPress={openImagePicker}>
            {selectedImage ? (
              <Image
                source={{uri: selectedImage}}
                style={styles.selectImage}
              />
            ) : (
              <View
                style={styles.view}>
                <FontAwesomeIcon
                  icon={icons.faImage}
                  size={30}
                  style={{
                    color: '#ff8700',
                  }}
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.style1}>
            <View
              style={styles.style2}>
              <Text style={styles.services}>Services</Text>
              <TouchableOpacity onPress={handleToggleInput}>
                <FontAwesomeIcon
                  icon={icons.faCaretDown}
                  size={25}
                  style={{color: '#ff8700', marginLeft: 10}}
                />
              </TouchableOpacity>
            </View>

            <View
              style={styles.style3}>
              {isInputVisible && (
                <View>
                  <View style={styles.tagsContainer}>
                    <FlatList
                      data={tags}
                      horizontal
                      renderItem={({item, index}) => (
                        <View style={styles.tagitems}>
                          <Text>{item}</Text>
                          <TouchableOpacity onPress={() => removeTag(index)}>
                            <FontAwesomeIcon
                              icon={icons.faTimesCircle}
                              size={25}
                              style={{color: '#ff8700', marginLeft: 5}}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                      keyExtractor={(item, index) => index.toString()}
                    />
                  </View>

                  <View style={styles.tagupdatecontainer}>
                    <View style={styles.taginputcontainer}>
                      <TextInput
                        value={tagVal}
                        onChangeText={text => setTagVal(text)}
                        placeholder="Enter service"
                        onSubmitEditing={addTag}
                        style={styles.taginput}
                      />
                      <TouchableOpacity onPress={addTag}>
                        <FontAwesomeIcon
                          icon={icons.faCirclePlus}
                          size={25}
                          style={{color: '#ff8700', marginLeft: 10}}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleSaveTagInput}>
                      <Text
                        style={styles.saveText}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.phoneInfo}>Phone Information</Text>
          <TextInput
            style={styles.input}
            onChangeText={text => setNumber(text)}
            value={number}
            keyboardType="numeric"
          />

          <Text style={styles.about}>About</Text>
          <TextInput
            style={styles.input}
            onChangeText={text => setDescription(text)}
            value={description}
          />

          <Text style={styles.storeHours}>Store Hours</Text>
          <View style={styles.radio}>
            {daysOfWeek.map(({day, open, close}, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => toggleDaySelection(day)}>
                <View style={styles.wrap}>
                  <View style={styles.btn}>
                    {selectedDays.some(
                      selectedDay => selectedDay.day === day,
                    ) && <View style={styles.bg}></View>}
                  </View>

                  <Text style={styles.text}>{day}</Text>
                  {daysOfWeek.some(selectedDay => selectedDay.day === day) && (
                    <View style={{width: 85}}>
                      <Button
                        onPress={() => showOpenTimepicker(day)}
                        title={
                          selectedDays.find(d => d.day === day)?.open || 'Open'
                        }
                        color={'#FFAC4E'}
                      />
                    </View>
                  )}
                  <Text
                    style={styles.dashText}>
                    {' '}
                    -
                  </Text>

                  {daysOfWeek.some(selectedDay => selectedDay.day === day) && (
                    <View style={{width: 85}}>
                      <Button
                        onPress={() => showCloseTimepicker(day)}
                        title={
                          selectedDays.find(d => d.day === day)?.close ||
                          'Close'
                        }
                        color={'#FFAC4E'}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {openshow && (
            <DateTimePicker
              testID="dateOpenTimePicker"
              value={date}
              mode={mode}
              is24Hour={true}
              display="default"
              onChange={onChangeOpenTime}
            />
          )}
          {closeshow && (
            <DateTimePicker
              testID="dateCloseTimePicker"
              value={date}
              mode={mode}
              is24Hour={true}
              display="default"
              onChange={onChangeCloseTime}
            />
          )}

          <Text style={styles.loc}>Location</Text>
          <View style={styles.safeView2}>
            <MapView
              style={styles.mapView}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              onRegionChangeComplete={handleRegionChange}>
              <Marker
                coordinate={{
                  latitude: mapRegion.latitude,
                  longitude: mapRegion.longitude,
                }}
              />
            </MapView>
          </View>

          <View style={styles.btn}>
            <AppButton
              title="Save"
              onPress={saveClinicInfo}
              buttonStyle={styles.btn1}
              textStyle={styles.bt1}
            />
            <AppButton
              title="Skip"
              onPress={skipAddClinic}
              buttonStyle={styles.skip}
              textStyle={styles.skipText}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeView: {
    backgroundColor: '#FFAC4E'
  },
  safeView1: {
    padding: 0, 
    flex: 1
  },
  safeView2:{
    flex: 1
  },
  img:{
    position: 'relative',
  },
  img1:{
    flex: 1,
    position: 'absolute',
  },
  img2: {
    position: 'relative',
    bottom: '10%',
  },
  img3: {
    position: 'relative',
    marginLeft: '82%',          
    bottom: '10%',
  },
  img4: {
    position: 'relative',
    marginTop: 70,
  },
  img5: {
    flex: 1,
    position: 'absolute',
    top: 200,
    left: '85%',
  },
  img6:{
    flex: 1,
    position: 'absolute',
    top: 830,
  },
  scrollView:{
    backgroundColor: 'white',
    borderTopStartRadius: 50,
    borderTopEndRadius: 50,
    flex: 1,
    top: 170,
    shadowColor: 'black',
    shadowOffset: {
    width: -2,
    height: 10,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 20,
  },
  selectImage:{
    borderRadius: 30,
    margin: 30,
    height: 150,
  },
  view:{
    backgroundColor: '#ffb78f80',
    borderRadius: 30,
    margin: 30,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  style1:{
    flexDirection: 'column', 
    flexWrap: 'wrap' 
  },
  style2:{
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  style3:{
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 40,
    flexWrap: 'wrap',
    width: 350,
  },
  saveText:{
    marginLeft: 10,
    color: 'white',
    fontSize: 13,
    backgroundColor: '#ff8700',
    borderRadius: 10,
    padding: 10,
  },
  dashText:{
    fontSize: 15,
    color: '#5A2828',
    fontWeight: 'bold',
    marginRight: 5,
  },
  mapView:{
    flex: 1, 
    margin: 40, 
    height: 300
  },
  btn:{
    height: 300,
  },
  clinic: {
    paddingTop: 10,
    paddingLeft: 40,
    fontSize: 40,
    fontWeight: '600',
    color: '#5A2828',
    fontFamily: 'Poppins-SemiBold',
  },
  addClinic: {
    paddingTop: 10,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  services: {
    paddingTop: 0,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  phoneInfo: {
    paddingTop: 20,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  about: {
    flex: 1,
    paddingTop: 20,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  storeHours: {
    paddingTop: 20,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  loc: {
    paddingTop: 20,
    paddingLeft: 40,
    fontSize: 25,
    fontWeight: '400',
    color: '#5A2828',
    fontFamily: 'Poppins',
  },
  input: {
    padding: 0,
    fontSize: 25,
    width: 350,
    color: 'black',
    borderBottomWidth: 1.5,
    borderColor: '#FFBA69',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '7%',
  },
  btn1: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '20%',
    margin: 70,
    padding: 4,
    borderRadius: 50,
    backgroundColor: '#FFAC4E',
    shadowColor: 'black',
    shadowOffset: {
      width: -2,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 15,
    marginRight: '45%',
    height: '3%',
    bottom: '20%',
  },
  bt1: {
    color: 'white',
    fontSize: 25,
    fontWeight: '500',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  skip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '60%',
    margin: 10,
    padding: 4,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: 'black',
    shadowOffset: {
      width: -2,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 15,
    marginRight: '10%',
    height: '4%',
    bottom: '70%',
  },
  skipText: {
    color: '#FF8D4D',
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  radio: {
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: 2,
  },
  text: {
    marginLeft: 15,
    fontSize: 20,
    padding: 3,
    color: '#878787',
    fontFamily: 'Poppins-Regular',
    width: 130,
  },
  btn: {
    marginLeft: 45,
    width: 25,
    height: 25,
    borderRadius: 20,
    borderColor: '#FFAC4E',
    borderWidth: 3,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bg: {
    backgroundColor: '#FFAC4E',
    height: 15,
    width: 15,
    borderRadius: 20,
    margin: 2,
  },
  con: {
    flex: 1,
  },
  pug: {
    position: 'relative',
    bottom: '10%',
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    borderColor: '#FFAC4E',
    borderWidth: 2,
    borderRadius: 15,
    backgroundColor: 'white',
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginHorizontal: 5,
    height: 58,
    width: 335,
  },
  tagitems: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    margin: 6,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#FFAC4E',
    color: '#5A2828',
    backgroundColor: '#F1D5C6',
    borderRadius: 15,
  },
  taginputcontainer: {
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5A2828',
    fontSize: 15,
    marginLeft: 5,
    marginRight: 0,
    borderRadius: 15,
    margintop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    backgroundColor: '#F1D5C6',
  },

  taginput: {
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    color: '#5A2828',
    fontSize: 15,
    marginLeft: 5,
    backgroundColor: '#F1D5C6',
    borderRadius: 10,
  },
  tagupdatecontainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PawPalApp;