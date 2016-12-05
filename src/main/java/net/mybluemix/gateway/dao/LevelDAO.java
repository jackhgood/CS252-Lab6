package net.mybluemix.gateway.dao;

import java.util.ArrayList;

/**
 * Interface for level data access.
 */
public interface LevelDAO {

	/**
	 * Get the JSON data for a level.
	 * @param username the user who owns the level
	 * @param levelname the name of the level
	 * @return the JSON data for the level, or null if the user or the level does not exist
	 */
	public String getLevel(String username, String levelname);

	/**
	 * Save the JSON data for a level.
	 * @param username the user who owns the level
	 * @param levelname the name of the level
	 * @param leveldata the JSON data for the level
	 * @return true for success, false for failure
	 */
	public Boolean saveLevel(String username, String levelname, String leveldata);

	/**
	 * Retrieve a List of the levels that a user has created.
	 * @param username the user who owns the levels
	 * @return an ArrayList of strings containing levelnames, or null for failure
	 */
	public ArrayList<String> getLevels(String username);

}
