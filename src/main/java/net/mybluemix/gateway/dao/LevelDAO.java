package net.mybluemix.gateway.dao;

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
	 * @param name the name of the level
	 * @param leveldata the JSON data for the level
	 */
	public void saveLevel(String username, String name, String leveldata);

}
