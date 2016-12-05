package net.mybluemix.gateway.dao;

import javax.servlet.ServletContext;

/**
 * Instantiates data access objects.
 */
public class DAOFactory {

	public static LevelDAO getLevelDAO(ServletContext sc) {
		return new LevelDAOMongo(sc);
	}

	public static UserDAO getUserDAO(ServletContext sc) { return new UserDAOMongo(sc); }

}
