import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [userData, setUserData] = useState([]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/get`)
      .then((response) => {
        console.log(response.data);
        setUserData(response.data.users);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);
  return (
    <>
      <table className="table-auto" border="1">
        <thead>
          <tr>
            <th className="border border-gray-300">First Name</th>
            <th className="border border-gray-300">Last Name</th>
            <th className="border border-gray-300">Email</th>
            <th className="border border-gray-300">Company</th>
            <th className="border border-gray-300">Phone</th>
          </tr>
        </thead>
        <tbody>
          {userData.map((user) => (
            <tr key={user._id} className="border border-gray-300">
              <td className="border border-gray-300">{user.firstName}</td>
              <td className="border border-gray-300">{user.lastName}</td>
              <td className="border border-gray-300">{user.email}</td>
              <td className="border border-gray-300">{user.companyName}</td>
              <td className="border border-gray-300">{user.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
