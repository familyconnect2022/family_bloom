import { profileService } from "../../services/profile/profileService";

export const useUserProfile = () => ({
  getUserProfile: profileService.get,
  createUserProfile: profileService.create,
  updateUserProfile: profileService.update,
});
