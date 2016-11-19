
package com.example.project.listener;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

/**
 * Populates the dataSource in a servlet context.
 */
public class AppListener implements ServletContextListener {

    /**
     * Populates the dataSource in a servlet context.
     * @param sce
     */
    @Override
	public void contextInitialized(ServletContextEvent sce) {
		ServletContext servletContext = sce.getServletContext();
	}

	@Override
	public void contextDestroyed(ServletContextEvent cse) {
	}
}
