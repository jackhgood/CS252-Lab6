package net.mybluemix.gateway.dao;

import java.util.ArrayList;

/**
 * Interface for level data access.
 */
public interface UserDAO {

    /**
     * Retrieve a List of users.
     * @return an ArrayList of strings containing usernames, or null for failure
     */
    public ArrayList<String> getUsers();

}