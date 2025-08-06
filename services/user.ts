import { apiGateway } from "@/lib/axios";
import type { User } from "@/contexts/auth/types";

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiGateway.get<User>("/users/me");
  return data;
}

//   [HttpGet]
//   public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
//   {
//       var users = await _userService.GetAll();
//       return Ok(users);
//   }

export async function fetchAllUsers(): Promise<User[]> {
  const { data } = await apiGateway.get<User[]>("/users");
  return data;
}
