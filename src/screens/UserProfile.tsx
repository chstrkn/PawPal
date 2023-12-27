import React, {useEffect, useState} from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faUser,
  faLock,
  faArrowLeft,
  faCirclePlus,
  faCheckCircle,
  faEnvelope,
  faAddressCard,
} from '@fortawesome/free-solid-svg-icons';
import {useNavigation} from '@react-navigation/native';
import {
  FIREBASE_AUTH,
  FIREBASE_DB,
  FIREBASE_STORAGE,
} from '../../firebase.config';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import {getDocs, collection, updateDoc, doc} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {launchImageLibrary} from 'react-native-image-picker';

const UserProfile = () => {
  const navigation = useNavigation();

  const auth = FIREBASE_AUTH;
  const db = FIREBASE_DB;

  const [currentName, setCurrentName] = useState('');
  const [currentBio, setCurrentBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);

  const openImagePicker = async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.error('Image picker error:', response.errorMessage);
      } else {
        setProfilePicture(response.assets[0].uri);
      }
    });
  };

  const uploadProfilePicture = async () => {
    try {
      if (!profilePicture) {
        Alert.alert('Please select a profile picture');
        return;
      }

      const metadata = {
        contentType: 'image/jpeg', // Adjust the content type based on your image type
      };

      const storage = FIREBASE_STORAGE;
      const storageRef = ref(storage, `profile/${auth.currentUser?.uid}.jpeg`);

      // Convert image URI to Blob
      const response = await fetch(profilePicture);
      const blob = await response.blob();

      // Upload the image to Firebase Storage
      await uploadBytes(storageRef, blob, metadata);

      // Get the download URL of the uploaded image
      const imageUrl = await getDownloadURL(storageRef);

      // Update the user profile in Firestore with the new image URL
      const userQuery = await getDocs(collection(db, 'user'));
      userQuery.forEach(async currentDoc => {
        if (currentDoc.data().userId === auth.currentUser?.uid) {
          const userRef = doc(collection(db, 'user'), currentDoc.id);
          const updateData = {
            username: currentDoc.data().username,
            bio: currentDoc.data().bio,
            password: currentDoc.data().password,
            profilePicture: imageUrl, // Add the profile image URL to the user data
          };

          try {
            await updateDoc(userRef, updateData);
            Alert.alert('Profile picture updated successfully');
          } catch (updateError) {
            console.error('Error updating profile:', updateError);
            Alert.alert('Error updating profile. Please try again.');
          }
        }
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error updating profile picture. Please try again.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'user'));
        querySnapshot.forEach(doc => {
          if (doc.data().userId === auth.currentUser?.uid) {
            setCurrentName(doc.data().username);
            setCurrentBio(doc.data().bio);
            setProfilePicture(doc.data().profilePicture);
          }
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, []);

  const reauthenticateUser = async currentPassword => {
    const user = auth.currentUser;

    // Create a credential with the user's current email and password
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );

    try {
      // Reauthenticate the user with the provided credential
      await reauthenticateWithCredential(user, credential);
      console.log('User reauthenticated successfully');
      return true; // Reauthentication successful
    } catch (error) {
      console.error('Error reauthenticating user:', error);
      return false; // Reauthentication failed
    }
  };

  const updateProfile = async () => {
    if (currentName === '') {
      Alert.alert('Please enter a username');
      return;
    }
    try {
      const userQuery = await getDocs(collection(db, 'user'));
      userQuery.forEach(async currentDoc => {
        if (currentDoc.data().userId === auth.currentUser?.uid) {
          const userRef = doc(collection(db, 'user'), currentDoc.id);
          const updateData = {
            username: currentName,
            bio: currentBio ? currentBio : '',
            password: currentDoc.data().password,
          };
          if (currentPassword !== '') {
            // Reauthenticate the user before changing the password
            const isReauthenticated = await reauthenticateUser(currentPassword);
            if (!isReauthenticated) {
              Alert.alert('Current password is incorrect');
              return;
            }
            try {
              updateData.password = newPassword;
              // Update the user document with new profile data and potentially new password
              await updateDoc(userRef, updateData);
              navigation.navigate('PetProfile');
              // Update the password after successfully updating the profile
              try {
                await updatePassword(auth.currentUser!, newPassword);
                Alert.alert('Profile and password updated successfully');
              } catch (error) {
                console.error('Error updating password:', error);
                Alert.alert('Error updating password. Please try again.');
              }
            } catch (updateError) {
              console.error('Error updating profile:', updateError);
              Alert.alert('Error updating profile. Please try again.');
            }
          } else {
            // If no current password provided, update the profile without updating the password
            try {
              await updateDoc(userRef, updateData);
              Alert.alert('Profile updated successfully');
              navigation.navigate('PetProfile');
            } catch (updateError) {
              console.error('Error updating profile:', updateError);
              Alert.alert('Error updating profile. Please try again.');
            }
          }
        }
      });
    } catch (error) {
      console.error('Error querying user data:', error);
      Alert.alert('Error updating profile. Please try again.');
    }
  };

  return (
    <ImageBackground
      source={require('../images/real_bg.png')}
      style={styles.backgroundImage1}>
      <View style={styles.container}>
        <View style={styles.back}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              style={styles.backIcon}
              size={25}
            />
          </TouchableOpacity>
          <Text style={styles.backText}>Edit User Profile</Text>
        </View>
        <View style={styles.profileContainer}>
          <Image
            source={
              profilePicture
                ? {uri: profilePicture}
                : require('../images/userIcon.png')
            }
            style={styles.profilePicture}
          />
          <TouchableOpacity
            style={styles.arrowAdd}
            onPress={() => openImagePicker()}>
            <FontAwesomeIcon
              icon={faCirclePlus}
              style={styles.arrowAdd}
              size={25}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faEnvelope} style={styles.icon} />
            <View style={styles.iconInputRow}>
              <Text style={styles.inputName}>{auth.currentUser?.email}</Text>
            </View>
          </View>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faUser} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder={currentName ? currentName : 'Username'}
              value={currentName}
              onChangeText={text => setCurrentName(text)}
            />
          </View>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faAddressCard} style={styles.icon} />
            <TextInput
              style={[styles.input, {fontSize: 16}, {top: 2}]}
              placeholder={currentBio ? currentBio : 'Tell more about yourself'}
              value={currentBio}
              onChangeText={text => setCurrentBio(text)}
              maxLength={500}
            />
          </View>
          <View style={styles.changePassword} />
          <Text style={styles.changePassword}>Change Password</Text>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faLock} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              secureTextEntry
              value={currentPassword}
              onChangeText={text => setCurrentPassword(text)}
            />
          </View>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faLock} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={text => setNewPassword(text)}
            />
          </View>
          <View style={styles.iconInputRow}>
            <FontAwesomeIcon icon={faCheckCircle} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={text => setConfirmPassword(text)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                updateProfile();
                uploadProfilePicture();
              }}
              accessible={true}
              accessibilityRole="button">
              <LinearGradient
                colors={['#FFAC4E', '#FF6464']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientBackground}>
                <Text style={styles.buttonSave}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              accessible={true}
              accessibilityRole="button">
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage1: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  back: {
    flexDirection: 'row',
    marginBottom: 40,
    top: 60,
  },
  backIcon: {
    color: '#FF8D4D',
    flexDirection: 'row',
    position: 'absolute',
    top: -69,
    left: 10,
    paddingRight: 30,
  },
  backText: {
    fontSize: 20,
    fontFamily: 'Poppins-Regular',
    color: '#5A2828',
    fontWeight: 'bold',
    marginLeft: 30,
    top: -70,
    left: 25,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 20,
  },
  arrowAdd: {
    color: '#FF8D4D',
    position: 'absolute',
    top: 45,
    right: 65,
    paddingRight: 30,
    marginBottom: 90,
    paddingVertical: 40,
  },
  formContainer: {
    marginTop: 5,
    marginLeft: -20,
  },
  iconInputRow: {
    //adjust length of input
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    marginBottom: 10,
    // right: 100,
    left: 0,
    // paddingRight: 15,
    width: 350,
  },
  icon: {
    color: '#FF8D4D',
    position: 'absolute',
    top: 15,
    marginLeft: 65, //move icons
    // marginRight: 10,
    paddingRight: 10,
    flexDirection: 'row',
    alignContent: 'center',
  },
  inputLabel: {
    color: '#FF8D4D',
    marginBottom: 8,
    // fontSize: 18,
  },
  input: {
    fontFamily: 'Poppins',
    flex: 1,
    fontSize: 20,
    height: 45,
    borderBottomWidth: 2,
    borderBottomColor: '#FF8D4D',
    marginLeft: 60,
    // marginBottom: 20,
    paddingHorizontal: 30,
    // width: 400,
  },
  inputName: {
    flex: 1,
    fontSize: 20,
    height: 40,
    borderBottomWidth: 2,
    top: 10,
    borderBottomColor: '#FF8D4D',
    marginLeft: 60,
    // marginBottom: 20,
    paddingHorizontal: 30,
    // width: 400,
    color: '#5A2828',
  },
  changePassword: {
    fontSize: 25,
    fontFamily: 'Poppins-Regular',
    left: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF8D4D',
    paddingHorizontal: 8,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
    borderRadius: 40,
  },
  buttonTextCancel: {
    color: '#FF8D4D',
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    alignSelf: 'center',
    top: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    borderRadius: 40,
  },
  gradientBackground: {
    borderRadius: 20,
    width: 150,
    height: 45,
    position: 'absolute',
    top: 0,
    left: 100,
    // right: -40,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  buttonSave: {
    // flexDirection: 'row',
    color: '#ffffff',
    fontSize: 19,
    fontFamily: 'Poppins-Regular',
    alignSelf: 'center',
    alignItems: 'center',
    alignContent: 'center',
    top: 8,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 20,
    left: -40,
    // paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 40,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.4,
    shadowRadius: 3,
    top: 7,
  },
});

export default UserProfile;
