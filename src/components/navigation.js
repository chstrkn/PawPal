import {useNavigation} from '@react-navigation/native';

export const useNavigateTo = routeName => {
  const navigation = useNavigation();

  const navigateToRoute = () => {
    navigation.navigate("AddClinicDetails");
  };

  return navigateToRoute;
};
